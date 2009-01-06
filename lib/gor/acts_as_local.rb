# ActsAsLocal
require 'json/pure'
require 'erb'
require 'gor/tables_to_sql'

module GoR #nodoc
  module ActsAsLocal #nodoc
    def self.included(mod)
      mod.extend(Methods)
    end
    


    
    module Methods
      attr :gor_params, true
          
      class Dummy < ActiveRecord::Base
      end
          
      def acts_as_local(params = {})
      #  extend GoR::ActsAsLocal::Methods::ClassMethods
        include GoR::ActsAsLocal::Methods::InstanceMethods
        after_filter :add_jscode
        
        self.gor_params = params
      end
      

    
#      module ClassMethods
#      #nothing is here yet  
#    end
      module InstanceMethods


          DS = File.join(File.dirname(__FILE__), 'javascripts', 'data_switch.js')
          GEARINIT = File.join(File.dirname(__FILE__), 'javascripts', 'gears_init.js')
          APPINST = File.join(File.dirname(__FILE__), 'javascripts', 'app_install.js')
          JESTER = File.join(File.dirname(__FILE__), 'javascripts', 'jester.js')
          JESTERLCL = File.join(File.dirname(__FILE__), 'javascripts', 'jester_local.js')
          LOCALCTRL = File.join(File.dirname(__FILE__), 'templates', 'local_controller')
          
          LOCALDB = File.join(File.dirname(__FILE__), 'templates', 'db_schema')
   
          PUBDS = File.join(RAILS_ROOT, 'public', 'javascripts', 'data_switch.js')
          PUBGI = File.join(RAILS_ROOT, 'public', 'javascripts', 'gears_init.js')
          PUBAI = File.join(RAILS_ROOT, 'public', 'javascripts', 'app_install.js')
          PUBDB = File.join(RAILS_ROOT, 'public', 'javascripts', 'local_db.js')
          PUBJT = File.join(RAILS_ROOT, 'public', 'javascripts', 'jester.js')
          PUBJL = File.join(RAILS_ROOT, 'public', 'javascripts', 'jester_local.js')
  
  
       
        
        def add_jscode
          local_view = false
          if params['action'].include? '_local' then
            local_view = true
          end
          
          @controller_filename = params['controller']+'_controller.js'
          
          loadjs = ""
          if (local_view == false) then
          generate_local_controller
          generate_db_schema
          if not response.headers['Content-Type'].include? 'application/xml'
          generate_manifest_file
          end
        end
        if not File.exist?(PUBDS) then
         #when first time the web app is visited, move the static files to public folder
        move_to_public(DS,PUBDS)
        move_to_public(GEARINIT,PUBGI)
        move_to_public(APPINST,PUBAI)
        move_to_public(JESTER,PUBJT)
        move_to_public(JESTERLCL,PUBJL)
        
        end
        
          code = generate_paths(local_view)
          response.body.gsub! '</head>', code.to_s+'</head>' if response.body.respond_to?(:gsub!)
          
          loadjs = generate_loadjs(local_view)
          response.body.gsub! '</head>', loadjs.to_s+'</head>' if response.body.respond_to?(:gsub!)
        end
        
        def generate_loadjs(local_view)
          
                    #inject code should be different on different views ( server: sync() local: index())
        if (local_view) then
          loadjs = <<-JSEOF
                    <script type='text/javascript'>
                    window.onload = function() {
                    isOnline(ok,ko,document.getElementsByName('online_status_span'));
                    }
                    local_request('new','post');
                    </script>
                    JSEOF
          else
                      loadjs = <<-JSEOF
                    <script type='text/javascript'>
                    window.onload = function() {
                    InstallOfflineApp(document.getElementsByName('gears_status_span'));
                    isOnline(ok,ko,document.getElementsByName('online_status_span'));
                    local_request('sync','post');
                    }
                    
                    </script>
                    JSEOF
        end
                  
            
        end
                  
        
        def generate_db_schema
             @connection = ActiveRecord::Base.connection
             @types = @connection.native_database_types

             @output = StringIO.new
  
             tables(@output)
             @output.rewind
             @dump = @output.read


              Dummy.establish_connection(
                :adapter => "sqlite3",
                :database  => "tmp/localdb"
              )
  
            Dummy.connection.send :instance_eval, @dump
  
  
  
            @sql = Dummy.connection.select_rows('select sql from sqlite_master where tbl_name != "sqlite_sequence"')
            
            template = File.read(LOCALDB).gsub(/^  /, '')
            rjs = ERB.new(template,0, "%<>")
            local_db = rjs.result(binding)
           
            #write them into public folder
            File.open PUBDB, 'w' do |f|
            f.write(local_db)
            end
  
        end
        
        def generate_local_controller
          #Get all the local actions' name
          @params = self.class.gor_params
          #@online_actions = (@params[:only] unless @params[:only].nil?) || self.public_methods(all=false)
          @online_actions= self.public_methods(all=false)
          
          #generate local controller from *_local actions in remote controller
          @offline_actions = {}
          @online_actions.each do |p|
              if ( p.include? "_local" ) then
                js = self.send(p.to_sym)
                name =  p[0,p.index('_local')]
                @offline_actions[name.to_s] = js.to_s
              end
            end
            
                
                
          
          #check if there are corresponding actions in
          #local controller files
         #lc_filename = File.join(RAILS_ROOT, 'app', 'controllers', 'local',controller_name+'_controller.json')
         pub_lc_filename = File.join(RAILS_ROOT, 'public', 'javascripts', @controller_filename)
         
         #@offline_actions = JSON.parse!(File.read(lc_filename))
         
#         @online_actions.each do |a|
#           unless @offline_actions.has_key? a
#             if @params[:except].nil? or (not @params[:except].include? a) then
#             raise 'Action: '+a+ ' is marked to \'acts_as_local\' but does not have corresponding local function'  
#             end
#           end
#         end
         
          
          #synthetize both online and offline javascript
          template = File.read(LOCALCTRL).gsub(/^  /, '')
          rjs = ERB.new(template,0, "%<>")
          local_controller = rjs.result(binding)
         
          #write them into public folder
          File.open pub_lc_filename, 'w' do |f|
          f.write(local_controller)
          end


        end
      
        def generate_manifest_file
          
          @online_actions= self.public_methods(all=false)
          @online_actions.each do |a|
            if @offline_actions.has_key? a or (@params[:except].nil? or ( @params[:except].include? a)) then
              @online_actions.delete(a)
            end
          end


          
          @offline_urls = Array.new
  #        @online_actions.each do |a|
 #          url = url_for(:controller=>controller_name, :action=>a,:only_path=>true)
  #          @offline_urls.push({'url'=> url.to_s})
  #        end
          
#          #Find all the internal links in the response page and put them in the offline json
#          @bodycopy = response.body.clone
#          
#          jsline = @bodycopy[/<script\b[^>]*>(.*?)<\/script>/]
#          while not jsline.nil?
#          #get the src
#          jssrc = jsline[/src=\"(.*).js/][5,jsline.length]  #trim src= and the quotes
#          #push to urls
#          @offline_urls.push({'url'=>jssrc})
#          #replace it with space in the copy
#          @bodycopy.gsub!(jsline,'')
#          jsline = @bodycopy[/<script\b[^>]*>(.*?)<\/script>/]
#          end

          #add all javascripts
          push_internal_links(/<script\b[^>]*>(.*?)<\/script>/)do |f| 
              if f.include? "src" then
              f[/src=\"(.*).js/][5,f.length] 
              end
          end
        
          #add all css
          push_internal_links(/<link\b[^>]*>/) do |f|
            f[/href=\"(.*)\.css/][6,f.length]
          end
          
          #add all pictures
         push_internal_links(/<img\b[^>]*>/) do |f|
            f[/src=\"(.*)\.(png|gif|jpg)/][5,f.length]
          end
          
        
          #trim src= and the quotes 
	   viewurl = url_for(:action => params['action'], :controller => params['controller'])          
          
            @offline_urls.push({'url'=>'/javascripts/'+@controller_filename})
           #@offline_urls.push({'url'=>'.', 'src'=>'/posts/new_local'})
            @offline_urls.push({'url'=>viewurl, 'src'=>viewurl+'_local'})
            @offline_urls.push({'url'=>'/javascripts/data_switch.js'})
            @offline_urls.push({'url'=>'/javascripts/gears_init.js'})
            @offline_urls.push({'url'=>'/javascripts/prototype.js'})
            @offline_urls.push({'url'=>'/javascripts/jester.js'})
            @offline_urls.push({'url'=>'/javascripts/jester_local.js'})
            #@offline_urls.push({'url'=>'/stylesheets/scaffold.css'})
          
            version = Time.now
            
            @manifest_json = {
              "betaManifestVersion"=>1,
              "version"=>version.strftime("%Y.%m.%d.%H.%M"),
              "entries"=>@offline_urls
              }
              
            manifest_file = JSON.fast_generate @manifest_json
            
            pub_manifest_file = File.join(RAILS_ROOT, 'public', 'manifest.json')
            
            File.open pub_manifest_file, 'w' do |f|
            f.write(manifest_file)
          end
          
          
          return @offline_urls.to_s
        end
        
        def push_internal_links(regexp)
          #Find all the internal links in the response page and put them in the offline json
          bodycopy = response.body.clone
          jsline = bodycopy[regexp]
          while not jsline.nil?
            #get the src
            jssrc = yield jsline
            #push to urls
            @offline_urls.push({'url'=>jssrc})
            #replace it with space in the copy
            bodycopy.gsub!(jsline,'')
            jsline = bodycopy[regexp]
          end
          @offline_urls
        end

        
        def move_to_public(src,dest)
          File.open dest, 'w' do |f|
          f.write(File.read(src))
          end
          
        end
     
        def generate_paths(local_view)


          if (local_view) then
          #return the paths of files
          "<script src=\"/javascripts/data_switch.js\" type=\"text\/javascript\"></script>\n"+ 
          "<script src=\"/javascripts/jester.js\" type=\"text\/javascript\"></script>\n"+ 
          "<script src=\"/javascripts/jester_local.js\" type=\"text\/javascript\"></script>\n"+ 
          "<script src=\"/javascripts/gears_init.js\" type=\"text\/javascript\"></script>\n"+
          "<script src=\"/javascripts/#{@controller_filename}\" type=\"text\/javascript\"></script>"
          else
            
          "<script src=\"/javascripts/data_switch.js\" type=\"text\/javascript\"></script>\n"+ 
          "<script src=\"/javascripts/jester.js\" type=\"text\/javascript\"></script>\n"+ 
          "<script src=\"/javascripts/jester_local.js\" type=\"text\/javascript\"></script>\n"+ 
          "<script src=\"/javascripts/gears_init.js\" type=\"text\/javascript\"></script>\n"+
          "<script src=\"/javascripts/app_install.js\" type=\"text\/javascript\"></script>\n"+
          "<script src=\"/javascripts/local_db.js\" type=\"text\/javascript\"></script>\n"
            
          end
          
          
          
          
      end
     end
    
    end
  end
end
