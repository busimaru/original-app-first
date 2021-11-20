let map;
let infowindow;
let markers = [];
let autocomplete;
let service;
let data_csv = "店舗名, 電話番号, URL\n";
let latlng;
const MARKER_PATH =
  "https://developers.google.com/maps/documentation/javascript/images/marker_green";
const hostnameRegexp = new RegExp("^https?://.+?/");

function initMap() {
  latlng = {lat: 35.681167, lng: 139.767052};  //東京駅の緯度経度
  map = new google.maps.Map(document.getElementById('map'),
   {
    center: latlng,
    zoom: 14
  });

  google.maps.event.addListener(map, 'drag', dispLatLng);

  //情報ウィンドウのインスタンスの生成
  infowindow = new google.maps.InfoWindow({
    content: document.getElementById("info-content"),
  });

  document.getElementById('search').addEventListener("click", function (){
    //PlacesService のインスタンスの生成（引数に map を指定）
    service = new google.maps.places.PlacesService(map);
  
    keyword = document.getElementById('keyword').value
    //種類（タイプ）やキーワードをもとに施設を検索（プレイス検索）するメソッド nearbySearch()
    service.nearbySearch({
      location: latlng,  //検索するロケーション
      radius: 2000,  //検索する半径（メートル）
      //type: ['restaurant']  //タイプで検索。文字列またはその配列で指定
      name: keyword
      //キーワードで検索する場合は name:'レストラン' や ['レストラン','中華'] のように指定
    }, callback);  //コールバック関数（callback）は別途定義

    //コールバック関数には results, status が渡されるので、status により条件分岐
    function callback(results, status) {
      // status は以下のような定数で判定（OK の場合は results が配列で返ってきます）
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        clearResults();
        clearMarkers();

        //results の数だけ for 文で繰り返し処理
        for (let i = 0; i < results.length; i++) {
          (function(local){
            setTimeout(()=>{
              console.log(local);
              const markerLetter = String.fromCharCode("A".charCodeAt(0) + (local % 26));
              const markerIcon = MARKER_PATH + markerLetter + ".png";
              //createMarker() はマーカーを生成する関数（別途定義）
              markers[local] = new google.maps.Marker({
                position: results[local].geometry.location,
                icon: markerIcon,
              });

              //createMarker(results[i]);
              markers[local].placeResult = results[local];
              google.maps.event.addListener(markers[local], "click", showInfoWindow);
              markers[local].setMap(map);
              service.getDetails(
                { placeId: results[local].place_id },
                (place, status) => {
                  if (status !== google.maps.places.PlacesServiceStatus.OK) {
                    return;
                  }
                  addResult(place)
                }
              );
            }, local * 300);
          })(i); 
        }
      }
    }

    //マーカーにイベントリスナを設定
    function showInfoWindow() {
      const marker = this;

      service.getDetails(
        { placeId: marker.placeResult.place_id },
        (place, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK) {
            return;
          }

          infowindow.open(map, marker);
          buildIWContent(place);
        }
      );
    }
  });
}

//マーカードラッグ
function dispLatLng(){
  latlng = map.getCenter();
}

function clearMarkers() {
  for (let i = 0; i < markers.length; i++) {
    if (markers[i]) {
      markers[i].setMap(null);
    }
  }

  markers = [];
}

function addResult(result) {
  const results = document.getElementById("results");
  const tr = document.createElement("tr");
  tr.style.backgroundColor = "#F0F0F0";

  const nameTd = document.createElement("td");
  const phonenumberTd = document.createElement("td");
  const weburlTd = document.createElement("td");

  const name = document.createTextNode(result.name);
  data_csv += result.name + ",";
  if (result.formatted_phone_number){
    const phonenumber = document.createTextNode(result.formatted_phone_number);
    data_csv += result.formatted_phone_number + ",";
    phonenumberTd.appendChild(phonenumber);
  }

  if (result.website){
    const weburl = document.createTextNode(result.website);
    data_csv += result.website;
    weburlTd.appendChild(weburl);
  }

  data_csv += "\n"

  nameTd.appendChild(name);

  tr.appendChild(nameTd);
  if (result.formatted_phone_number){
    tr.appendChild(phonenumberTd);
  }

  if (result.website){
    tr.appendChild(weburlTd);
  }
  results.appendChild(tr);
}

function clearResults() {
  const results = document.getElementById("results");
  data_csv = "店舗名, 電話番号, URL\n";
  while (results.childNodes[0]) {
    results.removeChild(results.childNodes[0]);
  }
}

// Load the place information into the HTML elements used by the info window.
function buildIWContent(place) {
  document.getElementById("iw-icon").innerHTML =
    '<img class="hotelIcon" ' + 'src="' + place.icon + '"/>';
  document.getElementById("iw-url").innerHTML =
    '<b><a href="' + place.url + '">' + place.name + "</a></b>";
  document.getElementById("iw-address").textContent = place.vicinity;
  if (place.formatted_phone_number) {
    document.getElementById("iw-phone-row").style.display = "";
    document.getElementById("iw-phone").textContent =
      place.formatted_phone_number;
  } else {
    document.getElementById("iw-phone-row").style.display = "none";
  }

  // The regexp isolates the first part of the URL (domain plus subdomain)
  // to give a short URL for displaying in the info window.
  if (place.website) {
    let fullUrl = place.website;
    let website = String(hostnameRegexp.exec(place.website));

    if (!website) {
      website = "http://" + place.website + "/";
      fullUrl = website;
    }

    document.getElementById("iw-website-row").style.display = "";
    document.getElementById("iw-website").textContent = website;
  } else {
    document.getElementById("iw-website-row").style.display = "none";
  }
}

function downloadCSV() {
  //ダウンロードするCSVファイル名を指定する
  let filename = "download.csv";
  //CSVデータ作成
  // addResultで作成済みのため、不要

  //BOMを付与する（Excelでの文字化け対策）
  let bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  //Blobでデータを作成する
  let blob = new Blob([bom, data_csv], { type: "text/csv" });

  //IE10/11用(download属性が機能しないためmsSaveBlobを使用）
  if (window.navigator.msSaveBlob) {
      window.navigator.msSaveBlob(blob, filename);
  //その他ブラウザ
  } else {
      //BlobからオブジェクトURLを作成する
      const url = (window.URL || window.webkitURL).createObjectURL(blob);
      //ダウンロード用にリンクを作成する
      const download = document.createElement("a");
      //リンク先に上記で生成したURLを指定する
      download.href = url;
      //download属性にファイル名を指定する
      download.download = filename;
      //作成したリンクをクリックしてダウンロードを実行する
      download.click();
      //createObjectURLで作成したオブジェクトURLを開放する
      (window.URL || window.webkitURL).revokeObjectURL(url);
  }
}

//ボタンを取得する
//const download = document.getElementById("download");
//ボタンがクリックされたら「downloadCSV」を実行する
//document.addEventListener("DOMContentLoaded", function(){
//  download.addEventListener("click", downloadCSV, false);
//},false)