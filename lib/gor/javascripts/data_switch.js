/**
 * @author marui
 */
var OnlineStatus = undefined ;
var LastStatus = undefined;


function isOnline(onSuccess, onFailue,status_id) {
	var TARGET = 'http://'+location.host+'/422.html';
	var RESPONSE = 4000;
	setInterval ( function() {ping(TARGET,RESPONSE,onSuccess,onFailue,status_id)},5000);
}

function removeViews() {
  try {
    var localServer = google.gears.factory.create('beta.localserver');
  } catch (ex) {
    alert('Could not create local server: ' + ex.message);
    return;
  }
  p = localServer.openManagedStore('Demo2');
  p.enabled = false;
}

function addViews() {
  try {
    var localServer = google.gears.factory.create('beta.localserver');
  } catch (ex) {
    alert('Could not create local server: ' + ex.message);
    return;
  }
  p = localServer.openManagedStore('Demo2');
  p.enabled = true;
}


function ok(sid) {
	for (var i = 0, len = sid.length; i < len; i++) {
		sid[i].innerHTML = "on";
		sid[i].style.color = "#33CC00";
	}
	LastStatus = OnlineStatus;
	OnlineStatus = true;
	if (LastStatus == false && OnlineStatus == true) {
		//online again...dada...remove the offline face
		removeViews();
		local_request('syncback','post');
		logTime('online');
		window.location.reload( false );

	}
	
}

function ko(sid) {
		for (var i = 0, len = sid.length; i < len; i++) {
		sid[i].innerHTML = "off";
		sid[i].style.color = "#0000FF";
	}

	LastStatus = OnlineStatus;
	OnlineStatus = false;
	if (LastStatus == true && OnlineStatus == false ) {
	addViews();
	logTime('offline');
	window.location.reload( false );
	}
}

function ping(url, timeout, onSuccess, onFailue,status_id) {

	var rnd = Math.ceil(Math.random()*100000);
	url = url+"?id="+rnd;
	
  var request = new XMLHttpRequest();
//  request.onreadystatechange = onReadyStateChange;

  // Called when an eo occus.
  function onRequestError() {
    request.abort();
    onFailue(status_id);
  }

  var timeoutTime = setTimeout(onRequestError, timeout);

  try {
    request.open('GET', url,true);
  request.onreadystatechange = onReadyStateChange;
    request.send(null);
  } catch(e) {
   // console.wan('Could not send ping equest: ' + e.message);
    clearTimeout(timeoutTime);
    //onRequestEo();
    return;
  }

  function onReadyStateChange() {
    if (request.readyState != 4) {
	//console.warn(request.readyState);
      return;
    }
    var r_status =0;
    try{r_status=(request && request.status);}catch(e){}
    
    if (r_status == 200) {
      // Success, clea the timeout time.
      clearTimeout(timeoutTime);
      onSuccess(status_id);   
    }

  }  
}

/////////////////////////////////////////////////////////////////////////////
//  Action switche

function link_to_switcher(update, action) {
	if(true == OnlineStatus){
	var content = online[action](update);
	}else
	{
	var content = offline[action]();
	document.getElementById(update).innerHTML = content;
	}

}

var POSTDATA;
var Model;
function params(name){
var b = new Hash(POSTDATA);
var ret = new Hash();

b.each (function(pair){
var regex = new RegExp("^"+name+"\\["+"(\\w+)"+"\\]","g");
var match = regex.exec(pair.key);
if (match != null) ret.set(match[1],pair.value);
});

return ret.toObject();
}

// Initialization of gears
var db = undefined;
var Model;
// Open this page's local database.
function dbinit() {
  if (db != undefined) return;

  if (window.google && google.gears) {
    try {
      db = google.gears.factory.create('beta.database');
      if (db) {
        db.open('gor-localdb');
      }
    } catch (ex) {
      alert('Could not load database: ' + ex.message);
    }
  }
}

function local_request(action,objname,postdata)
{
dbinit();
if (objname != null) {
Model = Resource.model(objname.capitalize());
}
if (postdata != null) {
POSTDATA =postdata;
obj = params(objname.toLowerCase());
pdata = Model.build(obj);

}
if (action == "sync")
{
	sync();
}
else if (action == "syncback")
{
	syncback();
}
else
{
offline[action]();
}
//index_server();
//      extend action name to offline version
//      document.getElementById(update).innerHTML = content;

}


function sync()
{
var newdata = Model.find("all");
var lastonlinetime = getLastTime('online');
newdata.each( function(p) {
	if (p.created_at > lastonlinetime) {Model.create_local(p);}
});
logTime('online');
}

function syncback()
{
var newdata = Model.find_local("all");
var lastofflinetime = getLastTime('offline');

newdata.each( function(p) {
		if (p.created_at > lastofflinetime) {p.id = undefined; p.save();}
});
}

function logTime(type)
{
		try {
	dbinit();
	time = new Date();
	now = time.getTime();
	sql = 'insert into online_track (type,time) values("'+type+'", '+now+')';
	db.execute(sql);
	}catch (ex) {
      alert('Error log time to database: ' + ex.message);
    }
}

function getLastTime(type)
{
	dbinit();
	sql = 'select time from online_track where type = "'+type+'" order by time desc';
	try {
	var lastrow = db.execute(sql);
	if (lastrow.isValidRow()){
	return lastrow.field(0);
	}
	else
	{
		return 0;
	}
	}catch (ex) {
      alert('Error get lastest time from database: ' + ex.message);
    }
	
}


