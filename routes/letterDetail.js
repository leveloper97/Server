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
          callback(err, connection, null);
        }
        else callback(null, connection);
      });
    },
    //2. 가져온 connection으로 query 실행 (이미 존재하는 회원인지 확인한다 select_query)
    function(connection, callback) {

      let decoded = jwtModule.decodeToken(req.headers.member_token);
      var receiver = decoded.memberId;
      // TODO:
      var sender = parseInt(req.query.sent_mem_id, 10) || 0;
      if (sender==0){
          result.message = "Sender is not existed";
          console.log(result.message);

      }
      let select_query = "select * from letter_list where member_id=" + receiver + " and sent_mem_id="+sender+"";
      connection.query(select_query, function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          callback(err, connection, null);
        }
        else if (data.length == 0 ) {
            result.message = "unexpected access5";
            console.log(result.message);
            callback(null, connection);
        }
        else {
          result.message = 'success loading message list';
          var sortedData = _.sortBy(data, 'sent_mem_id');
          var memberList = [];
          for (var x in sortedData) {
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
              //commentList.writtenTime=toKoreanString(data[x].written_time);
              messageData.messageDate = toKoreanString(sortedData[x].sent_date);
              console.log(messageData);
              memberList.push(messageData);
          }
          console.log("x" + x);
          var roomData = {};
          roomData.senderInfo = {senderId : sortedData[x].sent_mem_id,
                                senderName : sortedData[x].sent_mem_name,
                                senderPhoto : sortedData[x].sent_profile};
          var tempMemberList = JSON.parse(JSON.stringify(memberList));
          roomData.messageList = tempMemberList;
          memberList = [];
          result.roomList.push(roomData);
          callback(null, connection);
        }
      });
    },
    function(connection, callback) {
      let decoded = jwtModule.decodeToken(req.headers.member_token);
      var receiver = decoded.memberId;
      var sender = req.query.sent_mem_id;
      let delete_query =
      "delete from message where member_id=" + receiver +" and sent_mem_id="+sender+"";
      console.log(delete_query);
      connection.query(delete_query, function(err, data) {
        if(err) {
          console.log("delete query error : ", err);
          callback(err, connection, null);
        }
        else if (data.length == 0) {
            result.message = "DB is Null";
            console.log(result.message);
            callback(null, connection);
        }
        else {
        //  res.status(201).send(result);
          callback(null, connection);
        }
      });
      },
    //3. connection release
    function(connection, callback) {
      connection.release();
      callback(null, null, '-List');
    }
  ];

  async.waterfall(select_post_list_task, function(err, connection, room_list) {
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
      res.status(200).send(result);
      console.log(room_list);
    }
  });
});
router.get('/mypage', function(req, res) {
    var sender = parseInt(req.query.sent_mem_id, 10) || 0;
    var resultModelJson = {
        message: 'ok',
        modelInfo: {},
        modelPhoto1: '',
        modelPhoto2: '',
        modelPhoto3: '',
        modelPickList: [],
    };
    //var decoded = jwtModule.decodeToken(req.headers.member_token);
    var select_model_mypage_task = [
        //1. connection 가져오기
        function(callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log("getConnection error : ", err);
                    callback(err, connection, null);
                } else callback(null, connection);
            });
        },
        // 모델에 관한 정보들
        function(connection, callback) {

            let select_model_mypage_query =
                "select * from Member where member_id = ?";
            connection.query(select_model_mypage_query, sender, function(err, data) {
                if (err) {
                    console.log("select_model_mypage_query query error : ", err);
                    callback(err, connection, null);
                } else {
                    if (data.length !== 0) {
                        resultModelJson.modelInfo.memberId = data[0].member_id;
                        resultModelJson.modelInfo.memberName = data[0].member_name;
                        resultModelJson.modelInfo.memberPhoto = data[0].member_photo;

                        callback(null, connection);
                    }
                }
            });
        },
        //모델 현재 머리상태1(앞)
        function(connection, callback) {
            let model_photo1_query = "select * from model_hair_imgs where member_id  = ? and photo_type = 'hairCondition1' ";
            connection.query(model_photo1_query, sender, function(err, data) {
                if (err) {
                    console.log("model_photo1_query error : ", err);
                    callback(err, connection, null);
                } else {
                    if (!data.length == 0) {
                        resultModelJson.modelPhoto1 = data[0].member_photo;
                    }
                    callback(null, connection);
                }
            });
        },
        //모델 현재 머리상태2(옆)
        function(connection, callback) {

            let model_photo2_query = "select * from model_hair_imgs where member_id  = ? and photo_type = 'hairCondition2' ";
            connection.query(model_photo2_query, sender, function(err, data) {
                if (err) {
                    console.log("model_photo2_query error : ", err);
                    callback(err, connection, null);
                } else {
                    if (!data.length == 0) {
                        resultModelJson.modelPhoto2 = data[0].member_photo;
                    }

                    callback(null, connection);
                }
            });
        },
        //모델 현재 머리상태3(뒤)
        function(connection, callback) {

            let model_photo3_query = "select * from model_hair_imgs where member_id  = ? and photo_type = 'hairCondition3' ";
            connection.query(model_photo3_query, sender, function(err, data) {
                if (err) {
                    console.log("model_photo3_query error : ", err);
                    callback(err, connection, null);
                } else {
                    if (!data.length == 0) {
                        resultModelJson.modelPhoto3 = data[0].member_photo;

                    }

                    callback(null, connection);
                }
            });
        },
        //4. 모델이 찜한 목록
        function(connection, callback) {

            let mobel_pick_list_query = "select * from model_pick_list where picker_id = ? order by written_time desc;"
            connection.query(mobel_pick_list_query,sender, function(err, data) {
                if (err) {
                    console.log("mobel_pick_list_query query error : ", err);
                    callback(err, connection, null);
                } else {
                    if (data.length !== 0) {
                        for (var x in data) {
                            var pickList = {}
                            pickList.postId = data[x].post_id
                            pickList.postImg = data[x].notice_photo;
                            pickList.title = data[x].title;
                            pickList.place = data[x].sigugun;
                            resultModelJson.modelPickList.push(pickList);
                        }

                    }
                    res.status(200).send(resultModelJson);
                    callback(null, connection);
                }
            });
        },
        //5. connection release
        function(connection, callback) {
            connection.release();
            callback(null, null, 'modelMypage');
        }
    ];

    async.waterfall(select_model_mypage_task, function(err, connection, result) {
        if (connection) {
            connection.release();
        }

        if (err) {
            if (err != 'ok') {
                console.log("async.waterfall error : ", err);
                res.status(503).send({
                    message: 'failure',
                    detail: 'internal server error'
                });
            }
        } else {
            console.log(result);
        }
    });

});

module.exports = router;
