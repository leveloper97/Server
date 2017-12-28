const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
const jwtModule = require('../models/jwtModule');


/* 디자이너 sns 가입
* request params :
* memberFacebookCode         @Nullable
* memberKakaoCode            @Nullable
* memberName
* memberAge
* memberBelong
* memberBelongName
* memberCareer
*/
router.post('/designer/sns', function(req, res) {
  var resultJson = {
    message : '',
    position : '',
    method : '',
    member_token : ''
  };

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
    //2. 이미 존재하는 회원인지 확인, sns회원가입 같은 경우에는 DB에 존재하지 않는 회원이면 바로 res를 보내준다
    function(connection, callback) {
      let duplicate_check_query =
      "select member_id from Member where facebook_id = ? or kakao_id = ?";
      let params = [
        req.body.memberFacebookCode,
        req.body.memberKakaoCode
      ];
      connection.query(duplicate_check_query, params, function(err, data) {
        if(err){
          console.log("duplicate check select query error : ",err);
          callback(err, connection, null);
        }else{
          if(data.length==0){   // 해당회원이 없는 경우
            callback(null, connection);
          }
          else{   // 해당회원이 있으면 이미 가입한 계정이므로 insert 시키면 안됨
            res.status(201).send({
              message : "signup failure",
              detail : "duplicated sns code"
            });
            callback('ok');
          }
        }
      });
    },
    //3. sns code와 받아온 정보들을 DB에 insert한다.
    function(connection, callback) {
      var facebookCode;
      var kakaoCode;
      if(!req.body.memberFacebookCode) facebookCode = '0';
      else facebookCode = req.body.memberFacebookCode;
      if(!req.body.memberKakaoCode) kakaoCode = '0';
      else kakaoCode = req.body.memberKakaoCode;

      let insert_query =
      "insert into Member "+
      "(position, member_name, age, facebook_id, kakao_id, belong, belong_name, career) "+
      "values ('designer', ?, ?, ?, ?, ?, ?, ?)";
      let params = [
        req.body.memberName,
        req.body.memberAge,
        facebookCode,
        kakaoCode,
        req.body.memberBelong,
        req.body.memberBelongName,
        req.body.memberCareer
      ];
      connection.query(insert_query, params, function(err, data) {
        if(err) {
          console.log("insert query error : ", err);
          callback(err, connection, null);
        }
        else{
          resultJson.message = 'signup success';
          resultJson.position = 'designer';
          resultJson.method = 'sns';
          callback(null, connection);
        }
      });
    },
    //4. 회원가입 성공 후, 토큰 발급
    function(connection, callback) {
      let select_query =
      "select member_id from Member where facebook_id = ? or kakao_id = ?";
      let params = [
        req.body.memberFacebookCode,
        req.body.memberKakaoCode
      ];

      connection.query(select_query, params, function(err, data) {
        if(err){
          console.log("select query error while makeToken : ",err);
          callback(err, connection, null);
         }
      //  else{
      //     if(data.length==0){   // 해당회원이 없는 경우
      //       res.status(201).send({
      //         message : "signup failure",
      //         detail : "while making token"
      //       });
      //       callback(null, connection);
      //     }
          else{   // 해당회원이 있으면 토큰 발급
            let tokenString = jwtModule.makeToken(data[0]);
            resultJson.member_token = tokenString;
            res.status(201).send(resultJson);
            callback(null, connection);
          }
      //  }
      });
    },
    //6. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-signup/designer/sns');
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

/* 디자이너 이메일 가입
* request params :
* memberEmail
* memberPassword
* memberName
* memberAge
* memberBelong
* memberBelongName
* memberCareer
*/
router.post('/designer/email', function(req, res) {
  var resultJson = {
    message : '',
    position : '',
    method : '',
    member_token : ''
  };

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
      connection.query(duplicate_check_query, req.body.memberEmail, function(err, data) {
        if(err){
          console.log("duplicate check select query error : ",err);
          callback(err,connection, null);
        }else{
          if(data.length==0){   // 해당회원이 없는 경우
            callback(null, connection);
          }
          else{   // 해당회원이 있으면 이미 가입한 계정이므로 insert 시키면 안됨
            res.status(201).send({
              message : "signup failure",
              detail : "duplicated email"
            });
            callback('ok');
          }
        }
      });
    },
    //3. bcrypt로 패스워드 해싱
    function(connection, callback) {
      bcrypt.hash(req.body.memberPassword, null, null, function(err, hash) {
        if(err){
          console.log('bcrypt hashing error : ',err);
          callback(err, connection, null);
        }else{
          callback(null, connection, hash);
        }
      });
    },
    //4. 받아온 회원정보와 bcrypt로 암호화된 password를 DB에 insert한다.
    function(connection, bcryptedPassword ,callback) {
      let insert_query =
      "insert into Member "+
      "(position, email, password, member_name, age, belong, belong_name, career) "+
      "values ('designer', ?, ?, ?, ?, ?, ?, ?)";
      let params = [
        req.body.memberEmail,
        bcryptedPassword,
        req.body.memberName,
        req.body.memberAge,
        req.body.memberBelong,
        req.body.memberBelongName,
        req.body.memberCareer
      ];
      connection.query(insert_query, params, function(err, data) {
        if(err) {
          console.log("insert query error : ", err);
          callback(err, connection, null);
        }
        else{
          resultJson.message = 'signup success';
          resultJson.position = 'designer';
          resultJson.method = 'email';
          callback(null, connection);
        }
      });
    },
    //5. 회원가입 성공 후, 토큰 발급
    function(connection, callback) {
      let select_query = "select member_id from Member where email = ?";
      connection.query(select_query, req.body.memberEmail, function(err, data) {
        if(err){
          console.log("select query error while makeToken : ",err);
          callback(err,connection, null);
        }else{
          if(data.length==0){   // 해당회원이 없는 경우
            res.status(201).send({
              message : "signup failure",
              detail : "while making token"
            });
            callback(null, connection);
          }
          else{   // 해당회원이 있으면 토큰 발급
            let tokenString = jwtModule.makeToken(data[0]);
            resultJson.member_token = tokenString;
            res.status(201).send(resultJson);
            callback(null, connection);
          }
        }
      });
    },
    //6. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-signup/designer/email');
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

/* 모델 sns 가입
* request params :
* memberFacebookCode         @Nullable
* memberKakaoCode            @Nullable
* memberName
* memberAge
*/
router.post('/model/sns', function(req, res) {
  var resultJson = {
    message : '',
    position : '',
    method : '',
    member_token : ''
  };

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
      let duplicate_check_query =
      "select member_id from Member where facebook_id = ? or kakao_id = ?";
      let params = [
        req.body.memberFacebookCode,
        req.body.memberKakaoCode
      ];
      connection.query(duplicate_check_query, params, function(err, data) {
        if(err){
          console.log("duplicate check select query error : ",err);
          callback(err, connection, null);
        }else{
          if(data.length==0){   // 해당회원이 없는 경우
            callback(null, connection);
          }
          else{   // 해당회원이 있으면 이미 가입한 계정이므로 insert 시키면 안됨
            res.status(201).send({
              message : "signup failure",
              detail : "duplicated sns code"
            });
            callback('ok');
          }
        }
      });
    },
    //3. sns code와 받아온 정보들을 DB에 insert한다.
    function(connection, callback) {
      var facebookCode;
      var kakaoCode;
      if(!req.body.memberFacebookCode) facebookCode = '0';
      else facebookCode = req.body.memberFacebookCode;
      if(!req.body.memberKakaoCode) kakaoCode = '0';
      else kakaoCode = req.body.memberKakaoCode;

      let insert_query =
      "insert into Member "+
      "(position, member_name, age, facebook_id, kakao_id) "+
      "values ('model', ?, ?, ?, ?)";
      let params = [
        req.body.memberName,
        req.body.memberAge,
        facebookCode,
        kakaoCode
      ];

      connection.query(insert_query, params, function(err, data) {
        if(err) {
          console.log("insert query error : ", err);
          callback(err, connection, null);
        }
        else{
          resultJson.message = 'signup success';
          resultJson.position = 'model';
          resultJson.method = 'sns';
          callback(null, connection);
        }
      });
    },
    //4. 회원가입 성공 후, 토큰 발급
    function(connection, callback) {
      let select_query =
      "select member_id from Member where facebook_id = ? or kakao_id = ?";
      let params = [
        req.body.memberFacebookCode,
        req.body.memberKakaoCode
      ];

      connection.query(select_query, params, function(err, data) {
        if(err){
          console.log("select query error while makeToken : ",err);
          callback(err, connection, null);
        }else{
          if(data.length==0){   // 해당회원이 없는 경우
            res.status(201).send({
              message : "signup failure",
              detail : "while making token"
            });
            callback(null, connection);
          }
          else{   // 해당회원이 있으면 토큰 발급
            let tokenString = jwtModule.makeToken(data[0]);
            resultJson.member_token = tokenString;
            res.status(201).send(resultJson);
            callback(null, connection);
          }
        }
      });
    },
    //6. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-signup/model/sns');
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

/* 모델 이메일 가입
* request params :
* memberEmail
* memberPassword
* memberName
* memberAge
*/
router.post('/model/email', function(req, res) {
  var resultJson = {
    message : '',
    position : '',
    method : '',
    member_token : ''
  };

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
      connection.query(duplicate_check_query, req.body.memberEmail, function(err, data) {
        if(err){
          console.log("duplicate check select query error : ",err);
          callback(err, connection, null);
        }else{
          if(data.length==0){   // 해당회원이 없는 경우
            callback(null, connection);
          }
          else{   // 해당회원이 있으면 이미 가입한 계정이므로 insert 시키면 안됨
            res.status(201).send({
              message : "signup failure",
              detail : "duplicated email"
            });
            callback('ok');
          }
        }
      });
    },
    //3. bcrypt로 패스워드 해싱
    function(connection, callback) {
      bcrypt.hash(req.body.memberPassword, null, null, function(err, hash) {
        if(err){
          console.log('bcrypt hashing error : ',err);
          callback(err, connection, null);
        }else{
          callback(null, connection, hash);
        }
      });
    },
    //4. 받아온 회원정보와 bcrypt로 암호화된 password를 DB에 insert한다.
    function(connection, bcryptedPassword ,callback) {
      let insert_query =
      "insert into Member "+
      "(position, email, password, member_name, age) "+
      "values ('model', ?, ?, ?, ?)";
      let params = [
        req.body.memberEmail,
        bcryptedPassword,
        req.body.memberName,
        req.body.memberAge
      ];

      connection.query(insert_query, params, function(err, data) {
        if(err) {
          console.log("insert query error : ", err);
          callback(err, connection, null);
        }
        else{
          resultJson.message = 'signup success';
          resultJson.position = 'model';
          resultJson.method = 'email';
          callback(null, connection);
        }
      });
    },
    //5. 회원가입 성공 후, 토큰 발급
    function(connection, callback) {
      let select_query = "select member_id from Member where email = ?";
      connection.query(select_query, req.body.memberEmail, function(err, data) {
        if(err){
          console.log("select query error while makeToken : ",err);
          callback(err, connection, null);
        }else{
          if(data.length==0){   // 해당회원이 없는 경우
            res.status(201).send({
              message : "signup failure",
              detail : "while making token"
            });
            callback(null, connection);
          }
          else{   // 해당회원이 있으면 토큰 발급
            let tokenString = jwtModule.makeToken(data[0]);
            resultJson.member_token = tokenString;
            res.status(201).send(resultJson);
            callback(null, connection);
          }
        }
      });
    },
    //6. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-signup/model/email');
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
