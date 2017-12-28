const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const router = express.Router();
const async = require('async');
const jwtModule = require('../models/jwtModule');
/*
* request params :
* member_token       headers에 포함되어야 한다.
* postId            int
* taskType          int 0:찜해제, 1:찜
*/
router.post('/', function(req, res) {
  var resultJson = {message:''};
  var taskType = req.body.taskType;
  var selected_task;

  var pick_task = [
    //1. connection 가져오기
    function(callback) {
      pool.getConnection(function(err, connection) {
        if(err) {
          console.log("getConnection error : ",err);
          return callback(err, connection, null);
        }
        else return callback(null, connection);
      });
    },
    //2. 가져온 connection으로 query 실행
    function(connection, callback) {
      let decoded = jwtModule.decodeToken(req.headers.member_token);
      let select_query = "select * from pick where (member_id, post_id) = (?,?)";
      connection.query(select_query, [decoded.memberId, req.body.postId], function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          return callback(err, connection, null);
        }
        else{
          if(data.length==0){   // 해당회원이 없는 경우
            return callback(null, connection, decoded.memberId);
          }
          else{
            resultJson.message = 'already picked';
            return callback('ok', connection, null);
          }
        }
      });
    },
    //3. insert data into pick
    function(connection, memberId ,callback){

      let insert_query = "insert into pick values(?,?)";    //(post_id, member_id);
      connection.query(insert_query, [req.body.postId, memberId], function(err, data) {
        if(err){
          console.log("insert query error : ", err);
          return callback(err, connection, null);
        }
        else{
          resultJson.message='pick success';
          return callback(null, connection);
        }
      });
    },
    //4. connection release
    function(connection, callback) {
    //  connection.release();
      return callback(null, connection, '-pick or unpick');
    }
  ];

  var unpick_task = [
    //1. connection 가져오기
    function(callback) {
      pool.getConnection(function(err, connection) {
        if(err) {
          console.log("getConnection error : ",err);
          return callback(err, connection, null);
        }
        else return callback(null, connection);
      });
    },
    //2. 가져온 connection으로 query 실행 (이미 존재하는 회원인지 확인한다 select_query)
    function(connection, callback) {
      let decoded = jwtModule.decodeToken(req.headers.member_token);
      let select_query = "select * from pick where (member_id, post_id) = (?,?)";
      connection.query(select_query, [decoded.memberId, req.body.postId], function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          return callback(err, connection, null);
        }
        else{
          if(data.length==0){   // 이미 unpicked
            resultJson.message = 'already unpicked';
            return callback('ok', connection, null);
          }
          else{ //picked된 상태니까 delete 시행해줘야함.

            console.log('task unpick 0-3 ');
            return callback(null, connection, decoded.memberId);

          }
        }
      });
    },
    //3. delete data from pick
    function(connection, memberId , callback){
      let delete_query = "delete from pick where (post_id, member_id)=(?,?)";
      console.log('task unpick 0-3 ');

      connection.query(delete_query, [req.body.postId, memberId], function(err, data) {
        if(err){
          console.log("delete query error : ", err);
          return callback(err, connection, null);
        }
        else{
          resultJson.message = "unpick_task";
          return callback(null, connection);
        }
      });
    },
    //4. connection release
    function(connection, callback) {
      return callback(null, connection, '-pick or unpick');
    }
  ];

  if(taskType=='1'){//찜하기
    selected_task = pick_task;
  }else if(taskType=='0'){//찜해제하기
    selected_task = unpick_task;
  }else{
    resultJson.message = "improper task type";
  }

  async.waterfall(selected_task, function(err, connection, result) {
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
      else{  //'ok'로 무조건 분기
      console.log("이미 픽되어있음하히히히히히히");
        res.status(201).send({
          message : 'task fail',
          detail : "already (un)picked or no informaton about the postId"
        });
      }
    } else {
      res.status(200).send(resultJson);
      console.log(result);
    }
  });
});
module.exports = router;
