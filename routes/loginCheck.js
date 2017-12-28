const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const router = express.Router();
const async = require('async');
const jwtModule = require('../models/jwtModule');

/*
* request params :
* member_token       headers에 포함되어야 한다.
*/

var responseResult = {
  message : ""
}
router.post('/', function(req, res) {
  var login_check_task = [
    //1. connection 가져오기
    function(callback) {
      pool.getConnection(function(err, connection) {
        if(err) {
          console.log("getConnection error : ",err);
          responseResult.message = "internal server error";
          callback(err, connection, null);
        }
        else callback(null, connection);
      });
    },
    //2. 가져온 connection으로 query 실행 (이미 존재하는 회원인지 확인한다 select_query)
    function(connection, callback) {
      if (req.headers.member_token == "") {
        responseResult.message = "invalid token";
        return callback(null, connection);
      }

      let decoded = jwtModule.decodeToken(req.headers.member_token);
      let select_query = "select age, position from Member where member_id = ?";
      connection.query(select_query, [decoded.memberId], function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          return callback(err, connection, null);
        }
        else{
          if(data.length == 0){   // 해당회원이 없는 경우
            responseResult.message = "invalid token";
            return callback(null, connection)
          }
          else{
            responseResult.message = "token validated";
            responseResult.position = data[0].position;
            console.log('token validated');
          }
          return callback(null, connection);
        }
      });
    },
    //3. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, responseResult);
    }
  ];


  async.waterfall(login_check_task, function(err, connection, result) {
    if(connection){
      connection.release();
    }

    if(err){
      if(err!='ok'){
        console.log("async.waterfall error : ",err);
        responseResult.message = "internal server error";
        res.status(500).send(result);
      }
    }
    else {
      res.status(200).send(result);
    }
  });
});

module.exports = router;
