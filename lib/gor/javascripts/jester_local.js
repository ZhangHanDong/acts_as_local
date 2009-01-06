// Extension of Jester for use with local Google Gears database

/*
  Gears initialization
*/

var db;

// The following code opens the database and execute the SQLite statement.
function init() {
  if (window.google && google.gears) {
    try {
      db = google.gears.factory.create("beta.database");
      if (db) {
        db.open("gor-localdb");
      }
    } catch (e) {
      console.error("Could not load database: " + e.message);
    }
  }
}

/*
  Jester.Resource extensions (class methods)
*/

Object.extend(Jester.Resource, {

  // find_local: A local variant of Rails-style find
  // 
  // The id parameter is assumed to be a positive integer or the string "all".
  // Returns either a single instance of the model (for "first" or a numerical id)
  // or an array containing all records (for "all").
  // If an error occurs while executing the find, the returned value will be null.
  find_local : function(id) {
    // By convention, the table name is the plural of the model name
    var table = this._plural;
    // Build the SELECT statement
    var statement = "SELECT * FROM " + table + " WHERE ";
    var where = "";
    // Initialize the array of WHERE parameters
    var whereValues = [];
    
    // Build the WHERE clause based on the "id" argument
    if (id == "all") {
      where = "1 = 1";   // all records (a la Rails)
    } else if (id == "first") {
      where = "id = (select MIN(id) from " + table + ")";  // the first id created
    } else {
      where = "id = ?";
      whereValues.push(id);
    }
    sql += where;
    
    // Execute the query
    var result = [];
    try {
      var row = db.execute(statement, whereValues);
      while (row.isValidRow()) {
         result.push(this._buildRecord(row));
         row.next();
      }
      row.close();
    } catch (ex) {
      console.error("Error retrieving records from database: " + ex.message);
    }
    
    // Return the whole array if querying "all",
    // otherwise just return the first element
    if (id == "all")
      return result;
    return result[0];
  },

  // create_local: A local variant of Rails-style create
  //
  // Takes a params hash as an argument
  create_local : function(p) {
    if (p.created_at == undefined) {
      t = new Date();
      now = t.getTime();
      p._setAttribute("created_at", now);
      p._setAttribute("updated_at", now);
    }
    var len = p._properties.length; //len stores number of columns in the database.
    var c = [];

    var a = p.attributes(); //a stores the name value hash.

    var col;

    // gets class name, converts into lowercase and into plural form.
    var clsname = p.class.name; 
    var lower = clsname.toLowerCase(); 
    var plural = lower + "s"; 
    var argArray = [];

    var sql = "insert into"; 
    sql = sql + " " + plural;

    // get column names from properties and store it in an array
    for (var i = 0; i < len; i++) { 
      c[i] = p._properties[i];
    }

    // create SQLite insert command by concatenting cloumn names and values
    sql = sql+" "+"("+c[0]; 
 
    for (var j = 1; j < len - 1; j++) {
      sql = sql + "," + c[j];
    }

    sql = sql + "," + c[len-1] + " " + ")" + "values" + " " + "(";
    for (var j=0; j<len - 1; j++) {
      sql += "?" + ",";
    }
    sql += "?" + ")";

    //prepare argument array
    for (var j = 0; j < len; j++) {
      if (a[c[j]] == "") {
        argArray[j]= "NULL";
      } else {
        argArray[j]=a[c[j]];
      }
    }

    // This for loop gets values corresponding to the column names.
    try {
      db.execute(sql, argArray);
    } catch (e) {
      console.error("Error adding a record:" + e.message);
    }
  },
  
  /*
    Internal methods
  */
  
  // Builds a record from a Gears RecordSet row.
  _buildRecord : function(row) {
    var rowObject = {};
    var fieldCount = row.fieldCount()
    // Add all properties from the RecordSet to the row object
    for (var i = 0; i < fieldCount; i++) {
      rowObject[row.fieldName(i)] = row.field(i);
    }
    // Build a Jester.Resource object from the row object
    var record = this.build(rowObject);
    return record;
  }

});

/*
 Jester.Resource.prototype extensions (instance methods)
*/

Object.extend(Jester.Resource.prototype, {
 // save_local: A local variant of Rails-style save
 //
 // Builds an UPDATE statement corresponding to the current property values.
 // Returns the current record, or null if the database update fails.
 save_local : function() {
   // Get the properties of this record
   var props = this._properties;
   // Initiailize SQL clauses
   var update = "UPDATE " + this._tableName();
   var set = " SET "
   var where = " WHERE id = ?";
   // Initialize properties and values for the SET clause
   var setProperties = [];
   var setValues = [];
   // Start at index 1 to skip the ID property
   var numProperties = props.length;
   for (var i = 1; i < numProperties; i++) {
     // Build the SET clause
     setProperties.push(props[i] + " = ?") ;
     // Update the timestamp, if present, to the current date and time
     if (props[i] == "updated_at" || props[i] == "updated_on") {
       this[props[i]] = new Date();
     }
     // Build the array of values to use with the SET clause
     // These will be passed to the query as parameters
     setValues.push(this[props[p]]);
   }
   // Add the ID as the last parameter, to be used with the WHERE clause
   setValues.push(this.id);
   // Build the SET clause string as "set prop1 = ?, prop2 = ?, ..., propN = ?"
   set += setProperties.join(", ");
   // Execute the update
   var statement = update + set + where;
   try {
     db.execute(statement, setValues);  
   } catch (ex) {
     console.error("Error updating record: " + ex.message);
     return null;
   }
   return this;
 },
 
 // destroy_local: A local variant of Rails-style destroy
 //
 // Builds a DELETE statement for the current record.
 // Returns the current record, or null if the database update fails.
 destroy_local : function() {
   try {
     var statement = "DELETE FROM " + this._tableName() + " WHERE id = ?"
     var whereValues = [this.id];
     db.execute(statement, whereValues);
   } catch (ex) {
     console.log("Error destroying record: " + ex.message);
     return null;
   }
   return this;
 },
 
 /*
   Internal functions
 */
 
 // Gets the table name for this record object
 _tableName : function() {
   return this.class._plural;
 }
 
});
