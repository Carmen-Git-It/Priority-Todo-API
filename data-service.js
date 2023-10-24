const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

let mongoDBConnectionString = process.env.MONGO_URL;
let Schema = mongoose.Schema;

let connection;

let userSchema = new Schema({
  userName: {
    type: String,
    unique: true
  },
  password: String,
});

let itemSchema = new Schema({
  name: String,
  user: String,
  due: {
    type: Date,
  },
  severity: Number,
  complete: {
    type: Boolean,
    default: false,
  }
});

let User;
let Items;

module.exports.connect = function() {
  return new Promise(function (resolve, reject) {
    connection = mongoose.createConnection(mongoDBConnectionString);

    connection.on('error', err => {
      reject(err);
    })

    connection.once('open', () => {
      User = connection.model('users', userSchema);
      Items = connection.model('items', itemSchema);
      resolve();
    })
  });
}

module.exports.registerUser = function (userData) {
  return new Promise(function (resolve, reject) {

      if (userData.password != userData.password2) {
          reject("Passwords do not match");
      } else {

          bcrypt.hash(userData.password, 10).then(hash => {

              userData.password = hash;

              let newUser = new User(userData);

              newUser.save().then(() => {
                  resolve("User " + userData.userName + " successfully registered");  
              }).catch(err => {
                  if (err.code == 11000) {
                      reject("User Name already taken");
                  } else {
                      reject("There was an error creating the user: " + err);
                  }
              })
          }).catch(err => reject(err));
      }
  });
};

module.exports.checkUser = function (userData) {
  return new Promise(function (resolve, reject) {

      User.findOne({ userName: userData.userName })
          .exec()
          .then(user => {
              bcrypt.compare(userData.password, user.password).then(res => {
                  if (res === true) {
                      resolve(user);
                  } else {
                      reject("Incorrect password for user " + userData.userName);
                  }
              });
          }).catch(err => {
              reject("Unable to find user " + userData.userName);
          });
  });
};

module.exports.getItems = function (id) {
  return new Promise(function (resolve, reject) {
    Items.find({user: id}).exec().then(items => {
      resolve(items || []);
    }).catch(err => {
      reject(`Unable to get items for user with id: ${id}`);
    });
  });
}

module.exports.addItem = function (id, itemDetails) {
  return new Promise(function (resolve, reject) {
    if (!id) {
      reject('Require a User id to add an item.');
    }
    console.log("Adding item: " + JSON.stringify(itemDetails));
    itemDetails.user = id;
    itemDetails.due = new Date(itemDetails.due);

    let newItem = new Items(itemDetails);
    newItem.save().then(() => {
      resolve('Item ' + newItem.name + ' successfully added.');
    }).catch(err => {
      reject('There was an error creating the item: ' + err);
    });
  });
}

module.exports.removeItem = function(userId, itemId) {
  return new Promise(function (resolve, reject) {
    if (!userId || !itemId) {
      reject('Require a valid user ID and item ID to remove an item.');
    }

    Items.findById(itemId).exec().then((item) => {
      if (item.user !== userId) {
        reject('Item is not owned by user requesting removal.');
      }
    })
    .then(() => {
      Items.findByIdAndDelete(itemId).then((item) => {
        resolve('Successfully deleted item with id: ' + itemId);
      }).catch((err) => {
        reject('Error deleting item: ' + itemId + ' due to: ' + err);
      });
    })
    .catch((err) => {
      reject("Unable to find item: " + err);
    });
  });
}

module.exports.completeItem = function(userId, itemId) {
  return new Promise(function (resolve, reject) {
    if (!userId || !itemId) {
      reject('Require a valid user ID and item ID to update an item.');
    }

    const item = Items.findById(itemId).then((item) => {
      if (item.user !== userId) {
        reject('Item is not owned by user requesting update.');
      }
    })
    .then(() => {
      Items.findOneAndUpdate({_id: itemId}, {complete: true}).then(() => {
        resolve('Successfully update completion status of item: ' + itemId);
      }).catch((err) => {
        reject('Unable to update completion status of item: ' + itemId);
      });
    })
    .catch((err) => {
      reject('Unable to find item: ' + err);
    });  
  });
}

module.exports.resetItem = function(userId, itemId) {
  return new Promise(function (resolve, reject) {
    if (!userId || !itemId) {
      reject('Require a valid user ID and item ID to reset an item.');
    }

    const item = Items.findById(itemId).then((item) => {
      if (item.user !== userId) {
        reject('Item is not owned by user requesting reset.');
      }
    })
    .then(() => {
      Items.findOneAndUpdate({_id: itemId}, {complete: false}).then(() => {
        resolve('Successfully update completion status of item: ' + itemId);
      }).catch((err) => {
        reject('Unable to update completion status of item: ' + itemId);
      });
    })
    .catch((err) => {
      reject('Error finding item: ' + err);
    });
  });
}