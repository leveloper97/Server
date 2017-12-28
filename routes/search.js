const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const router = express.Router();
const async = require('async');
const jwtModule = require('../models/jwtModule');

/*
* request params :
* sort(query)       String
* 0 최신순
* 1 거리순
* 2
*/
router.get('/latest', function(req, res) {
  var resultJson = {
    message : '',
    result : {
      postSize : 0,
      posts : [

      ]
    }
  };


  var select_post_list_task = [
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


      let select_query =
      "select * from notice_list order by written_time desc";
      connection.query(select_query, function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          callback(err, connection, null);
        }
        else{
          resultJson.message = 'successfully load LATEST post list data';
          resultJson.result.postSize = data.length;
          for(var x in data){
            let postInfo = {postLocationInfo : {}};
            postInfo.postId = data[x].post_id;
            postInfo.postImg = data[x].notice_photo;
            postInfo.postTitle = data[x].title;
            postInfo.postLocationInfo.fullAddress = data[x].full_address;
            postInfo.postLocationInfo.sido = data[x].sido;
            postInfo.postLocationInfo.sigugun = data[x].sigugun;
            postInfo.postLocationInfo.dong = data[x].dong;
            postInfo.postLocationInfo.detail = data[x].detail;
            resultJson.result.posts.push(postInfo);
          }
          res.status(200).send(resultJson);
          callback(null, connection);
        }
      });
    },
    //3. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-postList');
    }
  ];

  async.waterfall(select_post_list_task, function(err, connection, result) {
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


router.get('/nearest', function(req, res) {
  var resultJson = {
    message : '',
   result : {
      postSize : 0,
      posts : [

      ]
    }
  };
var latitude = req.query.latitude;
var longitude = req.query.longitude;

  var select_post_list_task = [
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


      let select_query =
      "select * from notice_list order by (6371*acos(cos(radians("+latitude+"))*cos(radians(latitude))*cos(radians(longitude)-radians("+longitude+"))+sin(radians("+latitude+"))*sin(radians(latitude))))";
      connection.query(select_query, function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          callback(err, connection, null);
        }
        else{



          resultJson.message = 'successfully load NEAREST post list data';
          resultJson.result.postSize = data.length;
          for(var x in data){
            let postInfo = {postLocationInfo : {}};
            postInfo.postId = data[x].post_id;
            postInfo.postImg = data[x].notice_photo;
            postInfo.postTitle = data[x].title;
            postInfo.postLocationInfo.fullAddress = data[x].full_address;
            postInfo.postLocationInfo.sido = data[x].sido;
            postInfo.postLocationInfo.sigugun = data[x].sigugun;
            postInfo.postLocationInfo.dong = data[x].dong;
            postInfo.postLocationInfo.detail = data[x].detail;
            resultJson.result.posts.push(postInfo);
          }
          res.status(200).send(resultJson);
          callback(null, connection);
        }
      });
    },
    //3. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-postList');
    }
  ];

  async.waterfall(select_post_list_task, function(err, connection, result) {
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
