let polygonIds = [];
let parselData = [];
let currentUserRole = null;

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
    parselData = parcels; // API'den gelen verileri sakla
    drawnItems.clearLayers(); // Önceki polygon'ları temizle
    polygonIds = []; // ID'leri temizle
    parcels.forEach((parsel, index) => {
      var polygon = L.polygon(JSON.parse(parsel.koordinatlar), { color: 'blue', fillColor: 'pink', fillOpacity: 0.5 }).addTo(drawnItems);
      polygon._id = parsel.id; // Polygon'a bir ID ata
      polygonIds.push(parsel.id); // ID'yi diziye ekle
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

// Kullanıcı girişi
const login = async () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    if (result.role) {
      currentUserRole = result.role;
      alert(`Giriş başarılı! Rol: ${result.role}`);
      document.getElementById('login-form').style.display = 'none';
    } else {
      alert('Giriş başarısız!');
    }
  } catch (error) {
    console.error('Giriş yapılırken hata:', error);
  }
};

// Yeni parsel ekle
const saveParcel = async (parsel) => {
  if (currentUserRole !== 'admin') {
    alert('Sadece adminler parsel ekleyebilir!');
    return;
  }

  try {
    const response = await fetch('/api/parcels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsel),
    });
    const result = await response.json();
    console.log("API Yanıtı:", result);
    await getParcels(); // Parselleri yeniden yükle
  } catch (error) {
    console.error("API'ye veri kaydederken hata oluştu:", error);
  }
};

// Parsel bilgilerini kaydetme
function saveParselInfo(layer, index) {
  const parsel_no = document.getElementById('parsel_no').value;
  const bitki = document.getElementById('bitki').value;
  const sulama = document.getElementById('sulama').value;
  const proje_sahibi = document.getElementById('proje_sahibi').value;
  const projedurumu = document.getElementById('projedurumu').value;
  const proje_tarihi = document.getElementById('proje_tarihi').value;
  const Arazi_Egimi = document.getElementById('Arazi_Egimi').value;
  const coordinates = layer.getLatLngs();

  const parselBilgi = {
    parsel_no,
    koordinatlar: JSON.stringify(coordinates),
    bitki,
    sulama,
    proje_sahibi,
    projedurumu,
    proje_tarihi,
    Arazi_Egimi
  };

  saveParcel(parselBilgi);
  layer.bindPopup(generateReadonlyPopupContent(parselBilgi, index)).openPopup();
}

// Parsel sil
const deleteParcel = async (index) => {
  if (currentUserRole !== 'admin') {
    alert('Sadece adminler parsel silebilir!');
    return;
  }

  const id = polygonIds[index];

  try {
    const response = await fetch(`/api/parcels/${id}`, { method: 'DELETE' });
    if (response.ok) {
      await getParcels(); // Parselleri yeniden yükle
    } else {
      console.error('Parsel silinirken hata:', await response.text());
    }
  } catch (error) {
    console.error('Parsel silinirken hata:', error);
  }
};

// Düzenleme moduna geç
function editParselInfo(index) {
  const parsel = parselData[index];
  const layer = drawnItems.getLayers()[index];
  layer.bindPopup(generateEditablePopupContent(parsel, layer, index)).openPopup();
}

// Düzenlenmiş parsel bilgilerini güncelle
async function updateParselInfo(index) {
  const id = polygonIds[index];
  const parsel_no = document.getElementById('parsel_no').value;
  const bitki = document.getElementById('bitki').value;
  const sulama = document.getElementById('sulama').value;
  const proje_sahibi = document.getElementById('proje_sahibi').value;
  const projedurumu = document.getElementById('projedurumu').value;
  const proje_tarihi = document.getElementById('proje_tarihi').value;
  const Arazi_Egimi = document.getElementById('Arazi_Egimi').value;
  const coordinates = drawnItems.getLayers()[index].getLatLngs();

  try {
    const response = await fetch(`/api/parcels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parsel_no,
        koordinatlar: JSON.stringify(coordinates),
        bitki,
        sulama,
        proje_sahibi,
        projedurumu,
        proje_tarihi,
        Arazi_Egimi
      }),
    });
    const result = await response.json();
    console.log("Güncellenmiş Parsel:", result);
    await getParcels(); // Parselleri yeniden yükle
  } catch (error) {
    console.error("Parsel güncellenirken hata:", error);
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
    '<button type="button" onclick="updateParselInfo(' + index + ')">Kaydet</button>';
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
    (currentUserRole === 'admin'
      ? '<button type="button" onclick="editParselInfo(' + index + ')">Düzenle</button>' +
      '<button type="button" onclick="deleteParcel(' + index + ')">Sil</button>'
      : '');
}

// Çizim tamamlandığında polygon'u haritaya ekle
map.on(L.Draw.Event.CREATED, function (event) {
  if (currentUserRole !== 'admin') {
    alert('Sadece adminler parsel ekleyebilir!');
    return;
  }

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