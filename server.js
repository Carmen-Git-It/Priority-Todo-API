const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const jwt = require('jsonwebtoken');
const passport = require('passport');
const passportJWT = require('passport-jwt');
const dataService = require('./data-service');
const { createSuccessResponse, createErrorResponse } = require('./response');
require('./response');

const HTTP_PORT = process.env.PORT || 8080;

let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptions.secretOrKey = process.env.JWT_SECRET;

let strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
  if (jwt_payload) {
    next(null, {
      _id: jwt_payload._id,
      userName: jwt_payload.userName,
    })
  } else {
    next(null, false);
  }
});

passport.use(strategy);
app.use(passport.initialize());

app.use(express.json());
app.use(cors());

// User register
app.post('/api/user/register', (req, res) => {
  dataService.registerUser(req.body)
  .then((msg) => {
    res.status(200).json(createSuccessResponse(msg));
  }).catch((err) => {
    res.status(422).json(createErrorResponse(422, err));
  })
});

// User login
app.post('/api/user/login', (req, res) => {
  dataService.checkUser(req.body)
  .then((user) => {
    let payload = {
      _id: user._id,
      userName: user.userName,
    };

    let token = jwt.sign(payload, jwtOptions.secretOrKey);
    res.status(200).json(createSuccessResponse({'message': 'login successful', 'token': token}));
  })
  .catch((err) => {
    res.status(422).json(createErrorResponse(422, err));
  });
});

// Get all user items
app.get('/api/items', passport.authenticate('jwt', {session: false}), (req, res) => {
  dataService.getItems(req.user._id)
  .then((data) => {
    console.log("Got items for user " + req.user._id + ": " + JSON.stringify(data));
    res.status(200).json(createSuccessResponse(data));
  }).catch((err) => {
    res.status(422).json(createErrorResponse(422, err));
  });
});

// Add new item
app.put('/api/items', passport.authenticate('jwt', {session: false}), (req, res) => {
  console.log(req.user._id);
  dataService.addItem(req.user._id, req.body) // TODO: Make sure this lines up with client-side data
  .then((data) => {
    res.status(200).json(createSuccessResponse(data));
  }).catch((err) => {
    res.status(422).json(createErrorResponse(422, err));
  });
});

// Complete item
app.put('/api/items/complete/:id', passport.authenticate('jwt', {session: false}), (req, res) => {
  dataService.completeItem(req.user._id, req.params.id)
  .then((data) => {
    res.status(200).json(createSuccessResponse(data));
  }).catch((err) => {
    res.status(422).json(createErrorResponse(422, err));
  });
});

// Reset item
app.put('/api/items/reset/:id', passport.authenticate('jwt', {session: false}), (req, res) => {
  dataService.resetItem(req.user._id, req.params.id)
  .then((data) => {
    res.status(200).json(createSuccessResponse(data));
  }).catch((err) => {
    res.status(422).json(createErrorResponse(422, err));
  });
});

// Remove item
app.delete('/api/items/:id', passport.authenticate('jwt', {session: false}), (req, res) => {
  dataService.removeItem(req.user._id, req.params.id)
  .then((data) => {
    res.status(200).json(createSuccessResponse(data));
  }).catch((err) => {
    res.status(422).json(createErrorResponse(422, err));
  });
});

dataService.connect()
.then(() => {
  app.listen(HTTP_PORT, () => { console.log('API listening on: ' + HTTP_PORT)});
})
.catch((err) => {
  console.log('Unable to start the server: ' + err);
  process.exit();
});