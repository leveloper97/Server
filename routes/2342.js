const pool = require('../config/db_pool');
const mysql = require('mysql');
const express = require('express');
const router = express.Router();
const async = require('async');
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const moment = require('moment');

aws.config.loadFromPath('./config/aws_config.json');
const s3 = new aws.S3();
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'insungbucket',
        acl: 'public-read',
        key: function(req, file, cb) {
            cb(null, Date.now() + '.' + file.originalname.split('.').pop())
        }
    })
});


router.post('/', upload.single('image'), function(req, res) {

    var post_task = [
      function(callback) {
            pool.getConnection(function(err, connection) {
                if (err) {
                    console.log("getConnection error : ", err);
                    callback(err, connection, null);
                } else callback(null, connection);
            });
          },

      function(connection, callback) {

            let insert_post_query = "insert into images values (?, ?)";
            let imageUrl;

            if (!req.file) imageUrl = null;
            else imageUrl = req.file.location;
        //    console.log(imageUrl);
        //    console.log(req.body.id);

            let record = [
              req.body.id,
              imageUrl
            ];

              connection.query(insert_post_query, record, function(err, data) {
                  if (err)
                  {
                      console.log("insert_post query error : ", err);
                      callback(err, connection, null);
                  }
                  else
                  {
                    res.status(201).send({
                      message : 'ok'
                    });
                      callback(null, connection);
                  }
                });

            },

        function(connection, callback) {
            connection.release();
            callback(null, null, 'POST IS INSERTED');

        }
    ];

    async.waterfall(post_task, function(err, connection, result) {
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



/*
{
  "accessKeyId" : "AKIAJKVXZ7CI47DNOR3A",
  "secretAccessKey" : "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",
  "region":"ap-northeast-2"
}*/
