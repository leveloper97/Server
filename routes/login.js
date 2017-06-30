const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
const jwtModule = require('../models/jwtModule');


/*
* request params :
* memberEmail         String
* memberPassword      String
*/
router.post('/email', function (req, res) {
  var login_task = [
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
      let select_query = "select member_id, password from Member where email = ?";
      connection.query(select_query, req.body.memberEmail, function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          callback(err, connection, null);
        }
        else{
          if(data.length==0){   // 해당회원이 없는 경우
            res.status(201).send({
              message : "no information about the account"
            });
          }
          else{
            // bcrypt.compare("비교대상문자열","DB에 저장된 패스워드",function(err,result){//});
            console.log(data[0].password);
            bcrypt.compare(req.body.memberPassword, data[0].password, function (err, result) {
              if(err){
                console.log('bcrypt compare error : ',err);
                callback(err, connection, null);
              }else{
                if(result){
                  let token = jwtModule.makeToken(data[0]);
                  let resultJson = {
                    message : 'login success',
                    member_token : token
                  };
                  res.status(201).send(resultJson);
                }else{
                  res.status(201).send({
                    message : 'login failure'
                  });
                }
              }
            });
          }
          callback(null, connection);
        }
      });
    },
    //3. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-login/email');
    }
  ];


  async.waterfall(login_task, function(err, connection, result) {
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



/*
* request params :
* memberFacebookCode    @Nullable
* memberKakaoCode       @Nullable
*/
router.post('/sns', function (req, res) {
  var login_task = [
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
      var facebookCode;
      var kakaoCode;
      if(!req.body.memberFacebookCode) facebookCode = '';
      else facebookCode = req.body.memberFacebookCode;
      if(!req.body.memberKakaoCode) kakaoCode = '';
      else kakaoCode = req.body.kakaoCode;

      let select_query = "select member_id from Member where facebook_id = ? or kakao_id = ?";
      connection.query(select_query, [facebookCode, kakaoCode], function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          callback(err, connection, null);
        }
        else{
          if(data.length==0){   // 해당회원이 없는 경우
            res.status(201).send({
              message : "no information about SNS account"
            });
          }
          else{   //추가입력사항까지 다 입력하고 sns를 통해 회원가입한 회원이 있다면
            let token = jwtModule.makeToken(data[0]);
            let resultJson = {
              message : 'SNS login success',
              member_token : token
            };
            res.status(201).send(resultJson);
          }
          callback(null, connection);
        }
      });
    },
    //3. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null,'-login/sns');
    }
  ];

  async.waterfall(login_task, function(err, connection, result) {
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
