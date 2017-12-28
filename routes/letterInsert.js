const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const router = express.Router();
const async = require('async');
const jwtModule = require('../models/jwtModule');
const moment = require('moment');
console.log("success");

router.post('/', function(req, res){
  var result = {};
  var insert_letter_list_task = [
    //1. connection 가져오기
    function(callback) {
      pool.getConnection(function(err, connection) {
        if(err) {
          console.error("getConnection error : ",err);
          return callback(err, connection, null);
        }
        console.log("success");
        callback(null, connection);
      });
    },
    function(connection, callback) {

      let decoded = jwtModule.decodeToken(req.headers.member_token);
      var sender = decoded.memberId;
      var receiver = req.body.memberId;
    //  console.log(receiver);
      var content = req.body.content;
    //  console.log(req.body);
      //let sent_date = moment(req.body.serviceDate).format('YYYY-MM-DDTHH:mm:ssZ');
      var sent_date = [moment(new Date()).format('YYYY-MM-DD HH:mm:ssZ')];
      resultJson = { message: ""};
      console.log(sent_date);
      let insert_query = ""+
      "INSERT INTO message (member_id, sent_mem_id, sent_date, content) values (?, ?, ?, ?)";
    //  console.log(insert_query);
  //  console.log(sent_date);

      connection.query(insert_query, [req.body.memberId, decoded.memberId, sent_date, content], function(err, data) {
        if(err) {
          console.error("INSERT QUERY ERROR : ", err);
          resultJson.message = "internal server error";
          return callback(err, connection, null);
        }
        else {
          resultJson.message = 'Complete';
          return callback(null, connection);
        }
      });
    },
    //3. connection release
    function(connection, callback) {
      connection.release();
      return callback(null, null, resultJson);
    }
  ];

  async.waterfall(insert_letter_list_task, function(err, connection, result) {
    if(connection){
      connection.release();
    }
    if(err) {
        console.log("async.waterfall error : ",err);
        res.status(503).send(result);
    }
    else {
      res.status(201).send(result);
      console.log(result);
    }
  });
});

module.exports = router;
