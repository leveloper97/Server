const mysql = require('mysql'); //MySQL 쿼리문 사용
const pool = require('../config/db_pool'); //AWS RDS 연결
const express = require('express'); //Express 모듈 연결
const aws = require('aws-sdk');
const router = express.Router();
const multer = require('multer'); //파일 업로드 Multer 사용
const multerS3 = require('multer-s3'); //AWS s3 연결
const moment = require('moment'); //날짜, 시간을 위한 moment 모듈
const async = require('async'); //async 방식
const jwtModule = require('../models/jwtModule'); //계정을 위한 jwt 모듈
aws.config.loadFromPath('../config/aws_config.json');
const s3 = new aws.S3(); //s3 객체 생성
const upload = multer({ //파일 업로드를 위한 upload 객체 생성
    storage: multerS3({
        s3: s3,
        bucket: 'freety-storage',
        acl: 'public-read',
        key: function(req, file, cb) {
            cb(null, Date.now() + '.' + file.originalname.split('.').pop())
        }
    })
});
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

router.post('/writeComment', upload.single('image'), function(req, res) {
    var decoded = jwtModule.decodeToken(req.headers.member_token);
    var write_comment_task = [
        function(callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log("getConnection error : ", err);
                    callback(err, connection, null);
                } else callback(null, connection);
            });
        },
        // 상태 메세지 update
        function(connection, callback) {

            let write_comment_query = ""+
                "insert into commentBoard " +
                "(member_id, score, title, content, comment_photo, written_time, writer_id) " +
                "values (?,?,?,?,?,?,?)";

            if (!req.file) imageUrl = null;
            else imageUrl = req.file.location;
            let written_time = toKoreanString(moment(new Date()).format('YYYY-MM-DDTHH:mm:ssZ'));
            //toKoreanString(sortedData[x].sent_date);
            let record = [
                req.body.memberId,
                req.body.score,
                req.body.title,
                req.body.content,
                imageUrl,
                written_time,
                decoded.memberId
            ];


            connection.query(write_comment_query, record, function(err, data) {
                if (err) {
                    console.log("insert query error : ", err);
                    callback(err, connection, null);
                } else {
                    res.status(201).send({
                        message: 'ok'
                    });
                    callback(null, connection);
                }
            });
        },


        function(connection, callback) {
          //5. connection release
            connection.release();
            callback(null, null, 'comment');
        }
    ];

    async.waterfall(write_comment_task, function(err, connection, result) {
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
