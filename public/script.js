// Haritayı oluştur
var map = L.map('map').setView([40.9769, 27.5126], 13);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri'
}).addTo(map);

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
    edit: false,
    draw: {
        polygon: true,
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false
    }
});
map.addControl(drawControl);

// Parselleri API'den getir
const getParcels = async () => {
    try {
        const response = await fetch('/api/parcels');
        const parcels = await response.json();
        drawnItems.clearLayers(); // Önceki polygon'ları temizle
        parcels.forEach((parsel, index) => {
            var polygon = L.polygon(JSON.parse(parsel.koordinatlar), { color: 'blue', fillColor: 'pink', fillOpacity: 0.5 }).addTo(drawnItems);
            polygon._id = index; // Polygon'a bir ID ata
            polygon.bindPopup(generateReadonlyPopupContent(parsel, index));
        });
    } catch (error) {
        console.error("API'den veri çekerken hata oluştu:", error);
    }
};

// Sayfa yüklendiğinde parselleri getir
window.onload = async function () {
    await getParcels();
};

// Yeni parsel ekle
const saveParcel = async (parsel) => {
    try {
        const response = await fetch('/api/parcels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsel),
        });
        const result = await response.json();
        console.log("API Yanıtı:", result);
    } catch (error) {
        console.error("API'ye veri kaydederken hata oluştu:", error);
    }
};

// Parsel bilgilerini kaydetme
function saveParselInfo(layer, index) {
    var parsel_no = document.getElementById("parsel_no").value;
    var bitki = document.getElementById("bitki").value;
    var sulama = document.getElementById("sulama").value;
    var proje_sahibi = document.getElementById("proje_sahibi").value;
    var projedurumu = document.getElementById("projedurumu").value;
    var proje_tarihi = document.getElementById("proje_tarihi").value;
    var Arazi_Egimi = document.getElementById("Arazi_Egimi").value;
    var coordinates = layer.getLatLngs();
    var parselBilgi = {
        parsel_no: parsel_no,
        koordinatlar: coordinates,
        bitki: bitki,
        sulama: sulama,
        proje_sahibi: proje_sahibi,
        projedurumu: projedurumu,
        proje_tarihi: proje_tarihi,
        Arazi_Egimi: Arazi_Egimi
    };
    saveParcel(parselBilgi);
    layer.bindPopup(generateReadonlyPopupContent(parselBilgi, index)).openPopup();
}

// Parsel sil
const deleteParcel = async (index) => {
    try {
        await fetch(`/api/parcels/${index}`, { method: 'DELETE' });
        const layers = drawnItems.getLayers();
        if (layers[index]) {
            drawnItems.removeLayer(layers[index]);
            console.log("Parsel silindi:", index);
        } else {
            console.error("Silinecek parsel bulunamadı:", index);
        }
    } catch (error) {
        console.error("Parsel silinirken hata oluştu:", error);
    }
};

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
    layer._id = newIndex; // Polygon'a bir ID ata
    layer.bindPopup(generateEditablePopupContent(null, layer, newIndex)).openPopup();
});