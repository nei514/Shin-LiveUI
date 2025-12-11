var QuakeJson;
var JMAPointsJson;
var map = L.map('map', {
    preferCanvas: true,
    scrollWheelZoom: false,
    smoothWheelZoom: true,
    smoothSensitivity: 1.5,
}).setView([36.575, 137.984], 6);map.zoomControl.setPosition('topright');
map.attributionControl.addAttribution(
    "<a href='https://www.jma.go.jp/jma/index.html' target='_blank'>気象庁</a>"
);
//地図に表示させる上下の順番
map.createPane("world_map").style.zIndex = 2; //世界地図
map.createPane("pane_map2").style.zIndex = 3; //地図（市町村）
map.createPane("pane_map3").style.zIndex = 4; //地図（細分）
map.createPane("pane_map_filled").style.zIndex = 5; //塗りつぶし
map.createPane("shindo10").style.zIndex = 10;
map.createPane("shindo20").style.zIndex = 20;
map.createPane("shindo30").style.zIndex = 30;
map.createPane("shindo40").style.zIndex = 40;
map.createPane("shindo45").style.zIndex = 45;
map.createPane("shindo46").style.zIndex = 46;
map.createPane("shindo50").style.zIndex = 50;
map.createPane("shindo55").style.zIndex = 55;
map.createPane("shindo60").style.zIndex = 60;
map.createPane("shindo70").style.zIndex = 70;
map.createPane("shingen").style.zIndex = 100; //震源
map.createPane("tsunami_map").style.zIndex = 110; //津波

var PolygonLayer_Style_nerv = {
    "color": "#ffffff",
    "weight": 1.5,
    "opacity": 1,
    "fillColor": "#3a3a3a",
    "fillOpacity": 1
}
var PolygonLayer_Style_world = {
    "color": "#ffffff",
    "weight": 1.5,
    "opacity": 1,
    "fillColor": "#3a3a3a",
    "fillOpacity": 1
}
var japan_data;
var world_data;
$.getJSON("source/saibun.geojson", function (data) {
  japan_data = data;
    L.geoJson(data, {
        pane: "pane_map3",
        style: PolygonLayer_Style_nerv
    }).addTo(map);
}); 
$.getJSON("source/World.geojson", function (data) {
  world_data = data;
    L.geoJson(data, {
        pane: "world_map",
        style: PolygonLayer_Style_world
    }).addTo(map);
});
$.getJSON("source/JMAstations.json", function (data) {
    JMAPointsJson = data;
    GetQuake();
});

// 地震情報の取得
function GetQuake(option) {
    var url;
    if (!isNaN(option)) {
        url = "https://api.p2pquake.net/v2/history?codes=551&limit="+option;
    } else {
        url = "https://api.p2pquake.net/v2/history?codes=551&limit=20";
    }
    $.getJSON(url, function (data) {
        QuakeJson = data;

        while (document.getElementById('quakelist').lastChild) {
            document.getElementById('quakelist').removeChild(document.getElementById('quakelist').lastChild);
        }
    
        var forEachNum = 0;
        data.forEach(element => {
            var option = document.createElement("option");
            var text;
            let maxInt_data = element['earthquake']['maxScale'];
            let maxIntText = hantei_maxIntText(maxInt_data);
            let Name = hantei_Name(element['earthquake']['hypocenter']['name']);
            let Time = element['earthquake']['time'];
            if (element["issue"]["type"] == "ScalePrompt") {
                text = "【震度速報】" + element["points"][0]["addr"] + "など " + "\n" + Time.slice(0, -3) + "\n最大震度 : " + maxIntText;
            } else if (element["issue"]["type"] == "Foreign") {
                text = "【遠地地震】" + Time.slice(0, -3) + " " + Name;
            } else {
                text = Time.slice(0, -3) + " " + Name + " " +  "\n" + "\n最大震度 : " + maxIntText;
            }
            option.value = "" + forEachNum + "";
            option.textContent = text;
            document.getElementById('quakelist').appendChild(option);
            forEachNum++;
        });
    
        //地震情報リストをクリックしたときの発火イベント
        var list = document.getElementById('quakelist');
        list.onchange = event => {
            QuakeSelect(list.selectedIndex);
        }
        
        QuakeSelect(0);
    });
}

var shingenIcon;
var shindo_icon;
var shindo_layer = L.layerGroup();
var shindo_filled_layer = L.layerGroup();
var filled_list = {};

async function QuakeSelect(num) {

    if (shingenIcon && shindo_layer && shindo_filled_layer) {
        map.removeLayer(shingenIcon);
        map.removeLayer(shindo_layer);
        map.removeLayer(shindo_filled_layer);
        shingenIcon = "";
        shindo_layer = L.layerGroup();
        shindo_filled_layer = L.layerGroup();
        filled_list = {};
        shindo_icon = "";
    }
    let maxInt_data = QuakeJson[num]['earthquake']['maxScale'];
    var maxIntText = hantei_maxIntText(maxInt_data);
    var Magnitude = hantei_Magnitude(QuakeJson[num]['earthquake']['hypocenter']['magnitude']);
    var Name = hantei_Name(QuakeJson[num]['earthquake']['hypocenter']['name']);
    var Depth = hantei_Depth(QuakeJson[num]['earthquake']['hypocenter']['depth']);
    var tsunamiText = hantei_tsunamiText(QuakeJson[num]['earthquake']['domesticTsunami']);

    var Time = QuakeJson[num]['earthquake']['time'];

    var shingenLatLng = new L.LatLng(QuakeJson[num]["earthquake"]["hypocenter"]["latitude"], QuakeJson[num]["earthquake"]["hypocenter"]["longitude"]);
    var shingenIconImage = L.icon({
        iconUrl: 'source/shingen.png',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -40]
    });
    
    var icon_theme = "jqk";
    shingenIcon = L.marker(shingenLatLng, {icon: shingenIconImage }).addTo(map);
    shingenIcon.bindPopup('発生時刻：'+Time+'<br>最大震度：'+maxIntText+'<br>震源地：'+Name+'<span style=\"font-size: 85%;\"> ('+QuakeJson[num]["earthquake"]["hypocenter"]["latitude"]+", "+QuakeJson[num]["earthquake"]["hypocenter"]["longitude"]+')</span><br>規模：M'+Magnitude+'　深さ：'+Depth+'<br>受信：'+QuakeJson[num]['issue']['time']+', '+QuakeJson[num]['issue']['source'],{closeButton: false, zIndexOffset: 10000, maxWidth: 10000});
    shingenIcon.on('mouseover', function (e) {this.openPopup();});
    shingenIcon.on('mouseout', function (e) {this.closePopup();});
    // 震度アイコン画像 URL を作る
    let shindoIconUrl = `source/jqk_int${maxInt_data}.png`;

    // HTML作成
    var infoHTML = `
      <div class="eq-maxscale">
        最大震度 <img src="${shindoIconUrl}" class="eq-maxscale-icon"></div>
      <div class="eq-time">${formatJSTDate(Time)}</div>
      <div class="eq-hypo">震源地：${Name}</div>
      <div class="eq-item">地震の規模：M${Magnitude}</div>
      <div class="eq-item">震源の深さ：${Depth}</div>
      <div class="eq-tsunami-warning">津波の心配：${tsunamiText}</div>
    `;
    document.getElementById("eq-info").innerHTML = infoHTML;


    if (QuakeJson[num]["issue"]["type"] != "ScalePrompt") { //各地の震度に関する情報
        //観測点の震度についてすべての観測点に対して繰り返す
        QuakeJson[num]["points"].forEach(element => {
        var result = JMAPoints.indexOf(element["addr"]);
        if (result != -1) {
            var ImgUrl = "";
            var PointShindo = "";
            var icon_theme = "jqk";
            if (element["scale"] == 10) {
                ImgUrl = "source/"+icon_theme+"_int10.png";
                PointShindo = "震度1";
            } else if (element["scale"] == 20) {
                ImgUrl = "source/"+icon_theme+"_int20.png";
                PointShindo = "震度2";
            } else if (element["scale"] == 30) {
                ImgUrl = "source/"+icon_theme+"_int30.png";
                PointShindo = "震度3";
            } else if (element["scale"] == 40) {
                ImgUrl = "source/"+icon_theme+"_int40.png";
                PointShindo = "震度4";
            } else if (element["scale"] == 45) {
                ImgUrl = "source/"+icon_theme+"_int50.png";
                PointShindo = "震度5弱";
            } else if (element["scale"] == 46) {
                ImgUrl = "source/"+icon_theme+"_int_.png";
                PointShindo = "震度5弱以上と推定";
            } else if (element["scale"] == 50) {
                ImgUrl = "source/"+icon_theme+"_int55.png";
                PointShindo = "震度5強";
            } else if (element["scale"] == 55) {
                ImgUrl = "source/"+icon_theme+"_int60.png";
                PointShindo = "震度6弱";
            } else if (element["scale"] == 60) {
                ImgUrl = "source/"+icon_theme+"_int65.png";
                PointShindo = "震度6強";
            } else if (element["scale"] == 70) {
                ImgUrl = "source/"+icon_theme+"_int70.png";
                PointShindo = "震度7";
            } else {
                ImgUrl = "source/"+icon_theme+"_int_.png";
                PointShindo = "震度不明";
            }
            if (element["isArea"] == false) { //観測点
                let shindo_latlng = new L.LatLng(JMAPointsJson[result]["lat"], JMAPointsJson[result]["lon"]);
                let shindoIcon = L.icon({
                    iconUrl: ImgUrl,
                    iconSize: [20, 20],
                    popupAnchor: [0, -40]
                });
                let shindoIcon_big = L.icon({
                    iconUrl: ImgUrl,
                    iconSize: [34, 34],
                    popupAnchor: [0, -40]
                });
                shindo_icon = L.marker(shindo_latlng, { icon: shindoIcon,pane: eval('\"shindo'+element["scale"]+'\"') });
                shindo_icon.bindPopup('<ruby>'+element["addr"] + '<rt style="font-size: 0.7em;">' + JMAPointsJson[result]["furigana"] + '</rt></ruby>　'+ PointShindo,{closeButton: false, zIndexOffset: 10000,autoPan: false,});
                shindo_icon.on('mouseover', function (e) {
                    this.openPopup();
                });
                shindo_icon.on('mouseout', function (e) {
                    this.closePopup();
                });
                shindo_layer.addLayer(shindo_icon);
                //塗りつぶしの設定をする
                //AreaNameToCode()は下を参照。大阪府北部を520等に変換
                //filled_listは連想配列で{520: 10, 120: 20}など、エリアコード: 震度の大きさ
                var areaCode = AreaNameToCode(JMAPointsJson[result]["area"]["name"]);
                //filled_listにエリアコードがなかったり、さらに大きな震度になっていたら更新
                if ((!filled_list[areaCode]) || filled_list[areaCode] < element["scale"]) {
                    filled_list[areaCode] = element["scale"];
                }
            }
            //for(... in ...)もforEachと同等。keyに連想配列の名前が入る
            for (key in filled_list){ 
                var PointColor;
                if (filled_list[key] == 10) {
                    eval('PointColor = '+icon_theme+'_backColor_1');
                } else if (filled_list[key] == 20) {
                    eval('PointColor = '+icon_theme+'_backColor_2');
                } else if (filled_list[key] == 30) {
                    eval('PointColor = '+icon_theme+'_backColor_3');
                } else if (filled_list[key] == 40) {
                    eval('PointColor = '+icon_theme+'_backColor_4');
                } else if (filled_list[key] == 45) {
                    eval('PointColor = '+icon_theme+'_backColor_50');
                } else if (filled_list[key] == 46) {
                    eval('PointColor = '+icon_theme+'_backColor_50');
                } else if (filled_list[key] == 50) {
                    eval('PointColor = '+icon_theme+'_backColor_55');
                } else if (filled_list[key] == 55) {
                    eval('PointColor = '+icon_theme+'_backColor_60');
                } else if (filled_list[key] == 60) {
                    eval('PointColor = '+icon_theme+'_backColor_65');
                } else if (filled_list[key] == 70) {
                    eval('PointColor = '+icon_theme+'_backColor_7');
                }
                //引数"key"はエリアコード、"PointColor"は塗りつぶし色のHEX値
                FillPolygon(key, PointColor);
            }
        }
        });
    } else {
        var icon_theme = "jqk";
        var latlon;
        var latList = [];
        var lonList = [];
        QuakeJson[num]["points"].forEach(element => {
            var ImgUrl = "";
            var PointShindo = "";
            var PointColor;
            if (element["scale"] == 10) {
                eval('PointColor = '+icon_theme+'_backColor_1');
                ImgUrl = "source/"+icon_theme+"_int10.png";
                PointShindo = "震度1";
            } else if (element["scale"] == 20) {
                eval('PointColor = '+icon_theme+'_backColor_2');
                ImgUrl = "source/"+icon_theme+"_int20.png";
                PointShindo = "震度2";
            } else if (element["scale"] == 30) {
                eval('PointColor = '+icon_theme+'_backColor_3');
                ImgUrl = "source/"+icon_theme+"_int30.png";
                PointShindo = "震度3";
            } else if (element["scale"] == 40) {
                eval('PointColor = '+icon_theme+'_backColor_4');
                ImgUrl = "source/"+icon_theme+"_int40.png";
                PointShindo = "震度4";
            } else if (element["scale"] == 45) {
                eval('PointColor = '+icon_theme+'_backColor_50');
                ImgUrl = "source/"+icon_theme+"_int50.png";
                PointShindo = "震度5弱";
            } else if (element["scale"] == 46) {
                eval('PointColor = '+icon_theme+'_backColor_50');
                ImgUrl = "source/"+icon_theme+"_int_.png";
                PointShindo = "震度5弱以上と推定";
            } else if (element["scale"] == 50) {
                eval('PointColor = '+icon_theme+'_backColor_55');
                ImgUrl = "source/"+icon_theme+"_int55.png";
                PointShindo = "震度5強";
            } else if (element["scale"] == 55) {
                eval('PointColor = '+icon_theme+'_backColor_60');
                ImgUrl = "source/"+icon_theme+"_int60.png";
                PointShindo = "震度6弱";
            } else if (element["scale"] == 60) {
                eval('PointColor = '+icon_theme+'_backColor_65');
                ImgUrl = "source/"+icon_theme+"_int65.png";
                PointShindo = "震度6強";
            } else if (element["scale"] == 70) {
                eval('PointColor = '+icon_theme+'_backColor_7');
                ImgUrl = "source/"+icon_theme+"_int70.png";
                PointShindo = "震度7";
            } else {
                eval('PointColor = '+icon_theme+'_backColor__');
                ImgUrl = "source/"+icon_theme+"_int_.png";
                PointShindo = "震度不明";
            }
            var area_Code = AreaNameToCode(element["addr"]);
            latlon = FillPolygon(area_Code, PointColor);
            latList.push(Number(latlon["lat"]));
            lonList.push(Number(latlon["lng"]));
            let shindoIcon = L.icon({
                iconUrl: ImgUrl,
                iconSize: [30, 30],
                popupAnchor: [0, -50]
            });
            var shindo_icon = L.marker(latlon, { icon: shindoIcon,pane: eval('\"shindo'+element["scale"]+'\"') });
            shindo_icon.bindPopup('<ruby>'+element["addr"] + '<rt style="font-size: 0.7em;">' + AreaNameToKana(element["addr"]) + '</rt></ruby>　'+ PointShindo,{closeButton: false, zIndexOffset: 10000,autoPan: false,});
            shindo_icon.on('mouseover', function (e) {
                this.openPopup();
            });
            shindo_icon.on('mouseout', function (e) {
                this.closePopup();
            });
            shindo_layer.addLayer(shindo_icon);
            // console.log(element["addr"] + " " + PointShindo + " OK");
        });
        const aryMax = function (a, b) {return Math.max(a, b);}
        const aryMin = function (a, b) {return Math.min(a, b);}
        var latMax = latList.reduce(aryMax);
        var latMin = latList.reduce(aryMin);
        var lonMax = lonList.reduce(aryMax);
        var lonMin = lonList.reduce(aryMin);
        //通常時の位置初期化の位置
        shingenLatLng = new L.LatLng(Number((latMax+latMin)/2), Number((lonMax+lonMin)/2));
        latList = [];
        lonList = [];    
      }
    map.addLayer(shindo_layer);
    map.addLayer(shindo_filled_layer);
    
    if (QuakeJson[num]["issue"]["type"] == "Destination") {
        document.getElementById('title').innerText = "震源情報";
        document.getElementById('maxint_wrapper').style.display = "none";
        document.getElementById('shindo_legend').style.display = "none";
    }

    // 国外地震かどうかを判定
    if (QuakeJson[num]["issue"]["type"] == "Foreign") {
        // 国外地震の場合は震源を中心にして縮尺を小さく
        map.flyTo(shingenLatLng, 4, { duration: 0.5 });
        document.getElementById('title').innerText = "遠地地震情報";
    } else {
        // 国内地震の場合は従来通り
        map.flyTo(shingenLatLng, 8, { duration: 0.5 });
    }
}
function formatJSTDate(dateStr) {
    const date = new Date(dateStr);

    // 月は 0 始まりなので +1
    const month = date.getMonth() + 1;
    const day   = date.getDate();
    const hour  = date.getHours();
    const min   = date.getMinutes().toString().padStart(2, "0");

    return `${month}月${day}日 ${hour}時${min}分ごろ`;
}
function hantei_maxIntText(param) {
    let kaerichi = param == 10 ? "1" : param == 20 ? "2" : param == 30 ? "3" : param == 40 ? "4" :
    param == 45 ? "5弱" : param == 46 ? "5弱" : param == 50 ? "5強" : param == 55 ? "6弱" :
    param == 60 ? "6強" : param == 70 ? "7" : "不明";
    return kaerichi;
}
function hantei_Magnitude(param) {
    let kaerichi = param != -1 ? param.toFixed(1) : 'ー.ー';
    return kaerichi;
}
function hantei_Name(param) {
    let kaerichi = param != "" ? param : '情報なし';
    return kaerichi;
}
function hantei_Depth(param) {
    let kaerichi = param != -1 ? "約"+param+"km" : '不明';
    return kaerichi;
}
function hantei_tsunamiText(param) {
    let kaerichi = param == "None" ? "なし" :
    param == "Unknown" ? "不明" :
    param == "Checking" ? "調査中" :
    param == "NonEffective" ? "若干の海面変動" :
    param == "Watch" ? "津波注意報" :
    param == "Warning" ? "津波警報" : "情報なし";
    return kaerichi;
}
function AreaNameToCode(Name) {
    var array_Num = AreaName.indexOf(Name);
    return AreaCode[array_Num];
}
function AreaCodeToName(code) {
    var array_Num = AreaCode.indexOf(code);
    return AreaName[array_Num];
}
function AreaNameToKana(Name) {
    var array_Num = AreaName.indexOf(Name);
    return AreaKana[array_Num];
}
function FillPolygon(area_Code, PointColor) {
    var array_Num = AreaCode.indexOf(area_Code);
    if (array_Num != -1) {
        var style;
        style = {
            "color": "#ffffff",
            "weight": 1.2,
            "opacity": 1,
            "fillColor": PointColor,
            "fillOpacity": 1,
        }
        data_japan = japan_data["features"][array_Num];
        var Filled_Layer = L.geoJSON(data_japan, {
            style: style,
            pane: "pane_map_filled",
            onEachFeature: function (feature, layer) {
                if (feature.properties && feature.properties.popupContent) {
                    layer.bindPopup(feature.properties.popupContent);
                }
                layer.myTag = "Filled"
            },
        });
        shindo_filled_layer.addLayer(Filled_Layer);
        let latlon = centerPoint[area_Code];
        return latlon;
    }
}
// --- 震度アイコン凡例（右下） ---
const shindoLegend = L.control({ position: 'bottomright' });

shindoLegend.onAdd = function() {
    const div = L.DomUtil.create('div', 'shindo-legend');
    div.innerHTML = `
      <div class="legend-title">震度凡例</div>
      <div class="legend-item"><img src="source/jqk_int10.png"> 震度1</div>
      <div class="legend-item"><img src="source/jqk_int20.png"> 震度2</div>
      <div class="legend-item"><img src="source/jqk_int30.png"> 震度3</div>
      <div class="legend-item"><img src="source/jqk_int40.png"> 震度4</div>
      <div class="legend-item"><img src="source/jqk_int50.png"> 震度5弱</div>
      <div class="legend-item"><img src="source/jqk_int55.png"> 震度5強</div>
      <div class="legend-item"><img src="source/jqk_int60.png"> 震度6弱</div>
      <div class="legend-item"><img src="source/jqk_int65.png"> 震度6強</div>
      <div class="legend-item"><img src="source/jqk_int70.png"> 震度7</div>
    `;
    return div;
};

shindoLegend.addTo(map);
