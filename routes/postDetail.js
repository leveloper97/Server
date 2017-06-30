const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const router = express.Router();
const async = require('async');
const jwtModule = require('../models/jwtModule');

/*
* request params :
* postId          String
* member_token    headers
*/
router.get('/:postId', function(req, res) {
  var resultJson = {
    postDetail : {},
    postImgs : [],
    postImgsSize : 0,
    postLocation : {},
    writerInfo : {},
    isPicked : '',
    pickCount : -1
  };

  var select_post_detail_task = [
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
      let select_notice_detail_query =
      "select * from notice_detail where post_id = ?";
      connection.query(select_notice_detail_query, req.params.postId, function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          callback(err, connection, null);
        }
        else{
          if(data.length==0){     //상세글 정보가 없음
            callback('ok', connection);
          }
          else{
            resultJson.postDetail.title = data[0].title;
            resultJson.postDetail.content = data[0].content;
            resultJson.postDetail.servicePrice = data[0].price;
            resultJson.postDetail.serviceTime = data[0].service_time;
            resultJson.postDetail.typeCut = data[0].type_cut;
            resultJson.postDetail.typeDye = data[0].type_dye;
            resultJson.postDetail.typeEtc = data[0].type_ect;
            resultJson.postDetail.typePerm = data[0].type_perm;
            resultJson.postLocation.fullAddress = data[0].full_address;
            resultJson.postLocation.sido = data[0].sido;
            resultJson.postLocation.sigugun = data[0].sigugun;
            resultJson.postLocation.dong = data[0].dong;
            resultJson.postLocation.detail = data[0].detail;
            resultJson.postLocation.latitude = data[0].latitude;
            resultJson.postLocation.longitude = data[0].longitude;
            resultJson.writerInfo.writerId = data[0].writer_id;
            resultJson.writerInfo.writerImg = data[0].writer_photo;
            resultJson.writerInfo.writerName = data[0].writer_name;
            resultJson.writerInfo.writerBelongName = data[0].writer_belong_name;
            resultJson.postImgsSize = data.length;
            for(var x in data){
              let postPhoto = {};
              postPhoto.img = data[x].notice_photo;
              postPhoto.isMainImg = data[x].is_main;
              resultJson.postImgs.push(postPhoto);
            }
              callback(null, connection);
          }
        }
      });
    },
    //3. pickcount 확인하기
    function(connection, callback) {
      let pick_count_query = "select * from pick_count_better where post_id = ?"
      connection.query(pick_count_query, req.params.postId, function (err, data) {
        if(err) {
          console.log("select query error : ", err);
          callback(err, connection, null);
        }
        else{
          if(data.length==0){
            callback('ok', connection);
          }
          else{
            resultJson.pickCount = data[0].count;
            callback(null, connection);
          }
        }
      });
    },
    //4. isPicked 확인하기
    function(connection, callback) {
      let decoded = jwtModule.decodeToken(req.headers.member_token);
      let pick_status_query = "select * from pick where (member_id, post_id) = (?,?);"
      connection.query(pick_status_query, [decoded.memberId, req.params.postId], function(err, data) {
        if(err){
          console.log("select query error : ", err);
          callback(err, connection, null);
        }else{
          if(data.length==0){
            resultJson.isPicked = 'unpicked';
          }else{
            resultJson.isPicked = 'picked';
          }
          res.status(200).send(resultJson);
          callback(null, connection);
        }
      });
    },
    //5. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-postDetail');
    }
  ];

  async.waterfall(select_post_detail_task, function(err, connection, result) {
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
      else{   //err=='ok' 인 경우
        res.status(200).send({
          message : 'improper postId',
          detail : 'no information about postDetail at postId:'+req.params.postId
        });
      }
    }
    else {
      console.log(result);
    }
  });
});

module.exports = router;
