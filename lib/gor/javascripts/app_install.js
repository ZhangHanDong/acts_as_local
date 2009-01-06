/**
 * @author marui
 */

function create_db(){
	  var success = false; 
	  try {
      db = google.gears.factory.create('beta.database');

      if (db) {
        db.open('gor-localdb');
		for (var i = 0; i < db_schema.length; i++) {
			db.execute(db_schema[i]);
		}

        success = true;
      }

    } catch (ex) {
      alert('Could not create database: ' + ex.message);
    }
	return success;
	
}

function InstallOfflineApp(sid) {
  try {
    var localServer = google.gears.factory.create('beta.localserver');
  } catch (ex) {
    alert('Could not create local server: ' + ex.message);
    return;
  }
  var store = localServer.openManagedStore("Demo2");
  if (store == null ) {
  
  var store = localServer.createManagedStore("Demo2");
  store.enabled = false;
  store.manifestUrl = '/manifest.json';
  store.checkForUpdate();
  
  //the lastest database shcema is on local side
  //build localdb up
  create_db();
  }
  else {
  store.enabled = false;
  store.manifestUrl = '/manifest.json';
  store.checkForUpdate();
  }



  var timer = google.gears.factory.create('beta.timer');
  var timerId = timer.setInterval(function() {
    // When the currentVersion property has a value, all of the resources
    // listed in the manifest file for that version are captured. There is
    // an open bug to surface this state change as an event.
    if (store.currentVersion) {
      timer.clearInterval(timerId);
	  update_status(sid,store.currentVersion);
     //alert('Offline version ' +v+' installed.');
    }
  }, 500);
}

function update_status(sid,v){
		for (var i = 0, len = sid.length; i < len; i++) {
		sid[i].innerHTML = 'Offline version ' +v+' installed.';
		
	}
	


}
