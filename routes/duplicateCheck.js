const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const router = express.Router();
const async = require('async');
const jwtModule = require('../models/jwtModule');


/* 이메일 중복 확인
* request params :
* tempEmail(query)
*/
router.get('/', function(req, res) {
  var signInViaEmail_task = [
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
    //2. 이미 존재하는 회원인지 확인
    function(connection, callback) {
      let duplicate_check_query = "select * from Member where email = ?";
      connection.query(duplicate_check_query, req.query.tempEmail, function(err, data) {
        if(err){
          console.log("duplicate check select query error : ",err);
          callback(err, connection, null);
        }else{
          if(data.length==0){   // 해당회원이 없는 경우
            res.status(200).send({
              message : 'no duplication',
              detail : 'able to sign up'
            });
            callback(null, connection);
          }
          else{   // 해당회원이 있으면 이미 가입한 계정이므로 insert 시키면 안됨
            res.status(201).send({
              message : "duplicated",
              detail : "unable to sign up"
            });
            callback('ok', connection);
          }
        }
      });
    },
    //3. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-duplicateCheck/email?=');
    }
  ];

  async.waterfall(signInViaEmail_task, function(err, connection, result) {
    if(connection){
      connection.release();
    }

    if(err){
      if(err!='ok'){
        console.log("async.waterfall error : ",err);
        res.status(503).send({
          message : 'failuire',
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
