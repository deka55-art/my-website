// Polygon ID'lerini saklamak için bir dizi
let polygonIds = [];

// Harita ve çizim kontrolü değişkenleri
let map;
let drawnItems;
let drawControl;

// Haritayı başlatma fonksiyonu
function initializeMap() {
    map = L.map('map').setView([40.9769, 27.5126], 13);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
    }).addTo(map);

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Çizim kontrolünü oluştur (başlangıçta devre dışı)
    drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
        },
        draw: {
            polygon: true, // Çizimi aktif et
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false
        }
    });
    map.addControl(drawControl);

    // Çizim tamamlandığında polygon'u haritaya ekle
    map.on(L.Draw.Event.CREATED, function (event) {
        var layer = event.layer;
        drawnItems.addLayer(layer);

        // Yeni bir polygon için boş form göster
        var newIndex = drawnItems.getLayers().length - 1; // Yeni indeksi al
        var newId = polygonIds.length > 0 ? Math.max(...polygonIds) + 1 : 0; // Yeni ID'yi belirle
        layer._id = newId; // Polygon'a bir ID ata
        polygonIds.push(newId); // ID'yi diziye ekle
        console.log("Yeni polygon çizildi. ID:", newId); // Konsola yeni ID'yi yazdır
        layer.bindPopup(generateEditablePopupContent(null, layer, newIndex)).openPopup();
    });

    // Düzenleme modunu aktif et
    map.on(L.Draw.Event.EDITED, function (event) {
        var layers = event.layers;
        layers.eachLayer(function (layer) {
            console.log("Polygon düzenlendi:", layer._id);
            // Düzenlenen polygon'un popup'ını güncelle
            layer.bindPopup(generateReadonlyPopupContent(layer.parselBilgi, polygonIds.indexOf(layer._id))).openPopup();
        });
    });
}

// Düzenle butonuna tıklandığında çalışacak fonksiyon
function editParselInfo(index) {
    var layer = drawnItems.getLayers()[index];
    if (layer) {
        // Polygon'u düzenleme moduna geçir
        layer.editing.enable();
        console.log("Polygon düzenleme moduna geçti:", layer._id);
    } else {
        console.error("Düzenlenecek polygon bulunamadı:", index);
    }
}

// **📌 1: İlk Açılan (Düzenleme Modu) Popup İçeriği**
function generateEditablePopupContent(parsel, layer, index) {
    return '<b>Parsel Bilgisi</b><br>' +
        '<b>Parsel No:</b> <input type="text" id="parsel_no" value="' + (parsel?.parsel_no || '') + '"><br>' +
        '<b>Bitki Türü:</b> <input type="text" id="bitki" value="' + (parsel?.bitki || '') + '"><br>' +
        '<b>Sulama Durumu:</b> <input type="text" id="sulama" value="' + (parsel?.sulama || '') + '"><br>' +
        '<b>Proje Sahibi:</b> <input type="text" id="proje_sahibi" value="' + (parsel?.proje_sahibi || '') + '"><br>' +
        '<b>Proje Durumu:</b> <input type="text" id="projedurumu" value="' + (parsel?.projedurumu || '') + '"><br>' +
        '<b>Proje Bitiş Tarihi:</b> <input type="text" id="proje_tarihi" value="' + (parsel?.proje_tarihi || '') + '"><br>' +
        '<b>Arazi Eğimi:</b> <input type="text" id="Arazi_Egimi" value="' + (parsel?.Arazi_Egimi || '') + '"><br>' +
        '<button type="button" onclick="saveParselInfo(drawnItems.getLayers()[' + index + '], ' + index + ')">Kaydet</button>';
}

// **📌 2: Kaydettikten Sonra (Sadece Okunabilir) Popup İçeriği**
function generateReadonlyPopupContent(parsel, index) {
    return '<b>Parsel Bilgisi</b><br>' +
        '<b>Parsel No:</b> ' + parsel.parsel_no + '<br>' +
        '<b>Bitki Türü:</b> ' + parsel.bitki + '<br>' +
        '<b>Sulama Durumu:</b> ' + parsel.sulama + '<br>' +
        '<b>Proje Sahibi:</b> ' + parsel.proje_sahibi + '<br>' +
        '<b>Proje Durumu:</b> ' + parsel.projedurumu + '<br>' +
        '<b>Proje Bitiş Tarihi:</b> ' + parsel.proje_tarihi + '<br>' +
        '<b>Arazi Eğimi:</b> ' + parsel.Arazi_Egimi + '<br>' +
        '<button type="button" onclick="editParselInfo(' + index + ')">Düzenle</button>' +
        '<button type="button" onclick="deleteParcel(' + index + ')">Sil</button>';
}


// Düzenleme moduna geç
function editParselInfo(index) {
    var parsel = parselData[index];
    var layer = drawnItems.getLayers()[index];
    // Güncellenmiş düzenleme formunu aç
    layer.bindPopup(generateEditablePopupContent(parsel, layer, index)).openPopup();
}

// Çizim tamamlandığında polygon'u haritaya ekle
map.on(L.Draw.Event.CREATED, function (event) {
    var layer = event.layer; // Çizilen şekli al
    drawnItems.addLayer(layer); // Şekli haritaya ekle

    // Yeni bir polygon için boş form göster
    var newIndex = drawnItems.getLayers().length - 1; // Yeni indeksi al
    var newId = polygonIds.length > 0 ? Math.max(...polygonIds) + 1 : 0; // Yeni ID'yi belirle
    layer._id = newId; // Polygon'a bir ID ata
    polygonIds.push(newId); // ID'yi diziye ekle
    console.log("Yeni polygon çizildi. ID:", newId); // Konsola yeni ID'yi yazdır
    layer.bindPopup(generateEditablePopupContent(null, layer, newIndex)).openPopup();
});