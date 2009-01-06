#Local Helpers
module GoR
  module LocalHelper 
    
    def online_status_tag
      javascript = <<-EOF
      <span name="online_status_span">unknown</span>
      EOF
      
    end
    
    def gears_status_tag
      javascript = <<-EOF
      <span name="gears_status_span">unknown</span>
      EOF
      
    end
    
    def link_to_local(name,options = {})
      raise ":update and :action must be given to use link to local " if options[:update].nil? or options[:action].nil?
      js_function = "link_to_switcher('#{options[:update]}','#{options[:action]}')"
      link_to_function name, js_function
      
    end
    
def form_local_tag(options = {}, &block) 
	options[:form] = true
	options[:html] ||= {}
        options[:html][:action] = "javascript:void(0);"
	options[:html][:onsubmit] = (options[:html][:onsubmit] ? options[:html][:onsubmit] + "; " : "") + "local_request('#{options[:action]}','#{options[:objname]}',Form.serialize(this, true)); Form.reset(this); return false;"
     form_tag(options[:html].delete(:action),  options[:html], &block)
 end

 def form_local_for(record_name, *args, &proc)
   options = args.extract_options!
   #extend here for array later
   object_name = record_name
   
   options[:objname] = object_name

   concat(form_local_tag(options), proc.binding)
   fields_for(object_name, *(args << options), &proc)
   concat('</form>', proc.binding)
 end

 def local(content)
 

# content = content.gsub!(/puts\((.+)\)[\;]/) { "document.write("+ $1+");" }
 content = content.gsub!(/puts (.+)/) { "document.write("+ $1+");" }
 content = "<script>"+content+"</script>"

 end
    

    

    
     
    
  end
end
