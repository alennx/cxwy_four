appController.controller('pickdateCtrl', ['$scope','$rootScope','$location',
    function($scope,$rootScope,$location){
        $rootScope.$broadcast("appPause");
        //url地址后缀需要#?hpzl=02&hphm=贵AAAAA9
        var hpString=$location.search().hplist,phone=$location.search().phone,serial=$location.search().serial;
        var hpname=JSON.parse(localStorage.getItem("fourname"));
        if(hpname!='' && hpname!=undefined){
            //上传参数获取
            var pickdates = JSON.parse(localStorage.getItem(hpname.hpzl+hpname.hphm+"pickdate")),data={};
            data.phone=phone;
            data.serial=serial;
            data.content=[];
            if(pickdates!=null && pickdates!=undefined){
                for(var i=0;i<pickdates.length;i++){
                    data.content.push({hphm:hpname.hphm,hpzl:hpname.hpzl,date:pickdates[i].date,type:pickdates[i].type,des:pickdates[i].des});
                }
            }
        }
    }
]);
