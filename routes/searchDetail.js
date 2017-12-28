const mysql = require('mysql');
const pool = require('../config/db_pool');
const express = require('express');
const router = express.Router();
const async = require('async');
const jwtModule = require('../models/jwtModule');

router.get('/', function(req, res) {
  var resultJson = {
    message : '',
    result : {
      postSize : 0,
      posts : [

      ]
    }
  };
  var check_no = "1=1";
  var check_ect = "";
  var check_dye = "";
  var check_perm = "";
  var check_cut = "";
  var check_price = "";
  var check_date = "";
  var check_career = "";
  var check_sigugun = "";
  var check_sido = "";

  var sido = req.query.sido;
  var type_dye = req.query.typeDye;
  var type_perm = req.query.typePerm;
  var type_ect = req.query.typeEct;
  var type_cut = req.query.typeCut;
  var price= req.query.typeCut;
  var least_price = req.query.leastPrice;
  var high_price = req.query.highPrice;
  var least_date = req.query.leastDate;
  var high_date = req.query.highDate;
  var sort_career = req.query.career;
  var sigugun =req.query.sigugun;

  switch (check_date){
    case '':
      check_date = "1=1";
      break;
    default :
     check_date ="service_time BETWEEN ('"+least_date+"') and ('"+high_date+"')";
     break;
  }
  switch(check_price){
    case '':
    check_price = "1=1";
    break;
  default :
   check_price=""+least_price+"<price and price<"+high_price+"";
   break;
}
switch(check_sido){
  case '':
  check_sido = "1=1";
  break;
default :
 check_sido =sido;
 break;
}



switch (sigugun){
  case '무관':
    check_sigugun = "1=1";
    break;
  case '거리순' :
    check_sigugun = "sigugun='강남구'";
    break;
  case '강남/논현':
    check_sigugun = "sigugun='강남구'";
    break;
  case '홍대/합정':
      check_sigugun = "sigugun='마포구'";
      break;
  case '건대/광진':
      check_sigugun = "sigugun='광진구'";
      break;
  case '교대/서초':
      check_sigugun = "sigugun='서초구'";
      break;
  case '명동/종로':
      check_sigugun = "sigugun='중구' or sigugun = '용산구' or sigugun = '종로구'";
      break;
  case '분당/판교/용인':
      check_sigugun = "sigugun='성남시' or sigugun ='용인시'";
      break;
  case '가로수길/압구정':
      check_sigugun = "sigugun='강남구'";
      break;
  case '양재/도곡/대치':
      check_sigugun = "sigugun='강남구'";
      break;
  case '이대/신촌':
      check_sigugun = "sigugun='서대문구'";
      break;
  case '노원/강북':
      check_sigugun = "sigugun='노원구' or sigugun='강북구'";
      break;
  case '성신여대/대학로':
      check_sigugun = "sigugun='성북구' or sigugun='중구'";
      break;
  case '일산/은평':
      check_sigugun = "sigugun='은평구' or sigugun='일산동구' or sigugun='일산서구'";
      break;
  case '부천/인천':
      check_sigugun = "sigugun='부천시' or sigugun = '인천광역시'";
      break;
  case '구로/금천/광명':
      check_sigugun = "sigugun='금천구' or sigugun = '광명시' or sigugun = '구로구'";
      break;
  case '잠실/송파/강동':
      check_sigugun = "sigugun='송파구' or sigugun = '강동구' or sigugun = '강남구'";
      break;
  case '목동/강서/김포':
      check_sigugun = "sigugun='양천구' or sigugun = '강서구' or sigugun = '김포시'";
      break;
  case '안양/군포/안산':
      check_sigugun = "sigugun='안양시' or sigugun = '군포시' or sigugun = '안산시'";
      break;
  case '경기도 전체':
      check_sigugun = "sido='경기도'";
      break;
  case '기타':
      check_sigugun = "sido ='전라도' or sido='경상도'";
      break;
  default :
      check_sigugun = "1=1";
      break;
    }

switch (sort_career){
  case "1"://1년 이하
      check_career = "career='1년 이하'";
      break;
  case "2"://1년~3년
      check_career = "career='1~3년'";
      break;
  case "3"://3년~5년
      check_career = "career='3~5년'";
      break;
  case "4"://5년 이상
      check_career = "career='5년 이상'";
      break;
  default ://무관 일경우
      check_career = "1=1";
      break;
  }

  switch (type_dye) {
    default :
      check_dye ="1=1";
      break;
    case "1":
      check_dye = "type_dye=1";
      break;

    }
  switch (type_perm) {
    default :
      check_perm ="1=1";
      break;
    case "1":
      check_perm = "type_perm=1";
      break;
  }

  switch (type_ect) {
    default :
      check_ect ="1=1";
      break;
    case "1":
      check_ect = "type_ect=1";
      break;
    }

  switch (type_cut) {
    default :
      check_cut ="1=1";
      break;
    case "1":
      check_cut = "type_cut=1 ";
      break;
    }


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
      "select * from search_detail where "+check_dye+" and "+check_cut+" and "+check_ect+" and "+check_perm+" and "+check_price+" and "+check_career+" and "+check_date+" and "+check_sigugun+" and "+check_sido+"";
      connection.query(select_query, function(err, data) {
        if(err) {
          console.log("select query error : ", err);
          callback(err, connection, null);
        }
        else{
          resultJson.message = 'successfully load post list data';
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
      return callback(null, null, '-postList');
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
