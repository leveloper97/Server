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
router.post('/', function(req, res) {
  var login_check_task = [
    //1. connection 가져오기
    function(callback) {
      pool.getConnection(function(err, connection) {
        if(err) {
          console.log("getConnection error : ",err);
          callback(err, connection, null);
        }
        else callback(null, connection);
      });
    },
    //2. 가져온 connection으로 query 실행 (이미 존재하는 회원인지 확인한다 select_query)
    function(connection, callback) {
      let decoded = jwtModule.decodeToken(req.headers.member_token);
      let select_query = "select age from Member where member_id = ?";
      connection.query(select_query, decoded.memberId, function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          callback(err, connection, null);
        }
        else{
          if(data.length==0){   // 해당회원이 없는 경우
            res.status(201).send({
              message : "invalid token"
            });
          }
          else{
            res.status(201).send({
              message : "token validated"
            });
          }
          callback(null, connection);
        }
      });
    },
    //3. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-loginCheck');
    }
  ];


  async.waterfall(login_check_task, function(err, connection, result) {
    if(connection){
      connection.release();
    }

    if(err){
      if(err!='ok'){
        console.log("async.waterfall error : ",err);
        res.status(503).send({
          message : 'failure',
          detail : 'internal server error'
        });
      }
    }
    else {
      console.log(result);
    }
  });
});

module.exports = router;
