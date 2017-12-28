const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const router = express.Router();
const async = require('async');
const jwtModule = require('../models/jwtModule');
const _ = require('underscore');

function toKoreanString(dateTime) {
  var localeTime = new Date(new Date(dateTime).toLocaleString());
  var year = localeTime.getFullYear();
  var month = localeTime.getMonth() + 1;
  if (month < 10) {
    month = '0' + month;
  }
  var date = localeTime.getDate();
  if (date < 10) {
    date = '0' + date;
  }

  var hours = localeTime.getHours();
  if (hours < 10) {
    hours = '0' + hours;
  }

  var minutes = localeTime.getMinutes();
  if (minutes < 10) {
    minutes = '0' + minutes;
  }

  var seconds = localeTime.getSeconds();
  if (seconds < 10) {
    seconds = '0' + seconds;
  }

  return ''+ year + '-' + month + '-' + date + 'T' + hours + ':' + minutes + ':' + seconds;
}




router.get('/', function(req, res) {
  var result = {
    message : '',
    roomList : [
    ]
};
var select_post_list_task = [
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
      var sender = decoded.memberId;
      let select_query = "select * from letter_list where member_id=" + sender + "";
      connection.query(select_query, function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          return callback(err, connection, null);
        }
        else if (data.length == 0 ) {
            result.message = 'success loading message list';
            console.log(result.message);
            return callback(null, connection);
        }
        else {
          result.message = 'success loading message list';
          var sortedData = _.sortBy(data, 'sent_mem_id');
          //console.log(sortedData);
          var memberList = [];
          for (var x in sortedData) {
            //console.log("elem : " + sortedData[x].sent_mem_id);
            var messageData = {};
            if (x != 0 && (sortedData[x - 1].sent_mem_id != sortedData[x].sent_mem_id)) {
              console.log(sortedData[x - 1].sent_mem_id);
              var roomData = {};
              roomData.senderInfo = {senderId : sortedData[x - 1].sent_mem_id,
                                    senderName : sortedData[x - 1].sent_mem_name,
                                    senderPhoto : sortedData[x - 1].sent_profile};
              var tempMemberList = JSON.parse(JSON.stringify(memberList));
              roomData.messageList = tempMemberList;
              memberList = [];
              result.roomList.push(roomData);
            }
              messageData.messageContent = sortedData[x].content;
              messageData.messageDate = toKoreanString(sortedData[x].sent_date);
              memberList.push(messageData);
          }
          var roomData = {};
          roomData.senderInfo = {senderId : sortedData[x].sent_mem_id,
                                senderName : sortedData[x].sent_mem_name,
                                senderPhoto : sortedData[x].sent_profile};
          var tempMemberList = JSON.parse(JSON.stringify(memberList));
          roomData.messageList = tempMemberList;
          memberList = [];
          result.roomList.push(roomData);


      //    res.status(200).send(result);
          return callback(null, connection);
        }
      });
    },
    //3. connection release
    function(connection, callback) {
      connection.release();
      return callback(null, null, '-List');
    }
  ];

  async.waterfall(select_post_list_task, function(err, connection, room_list) {
    if(connection){
      connection.release();
    }

    if(err){
        console.log("async.waterfall error : ",err);
        res.status(503).send({
          message : 'failure',
          detail : 'internal server error'
        });
    }
    else {
      res.status(201).send(result);
      console.log(room_list);
    }
  });
});

module.exports = router;
