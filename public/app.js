// public/app.js
const API = '/api/products';
const productList = document.getElementById('productList');
const refreshBtn = document.getElementById('refreshBtn');
const btnToggle = document.getElementById('btnToggle');
const sidebar = document.getElementById('sidebar');

if (btnToggle) {
  btnToggle.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
  });
}

async function loadProducts() {
  productList.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">Loading...</div>';
  try {
    const res = await fetch(API);
    const json = await res.json();
    const data = json.data || [];
    if (!data.length) {
      productList.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">Tidak ada produk</div>';
      updateChart([]);
      return;
    }

    productList.innerHTML = '';
    data.forEach(p => {
      const el = document.createElement('div');
      el.className = 'bg-gray-700 p-3 rounded flex gap-3 items-center';
      el.innerHTML = `
        <img src="${p.image || 'https://via.placeholder.com/150'}" class="w-20 h-20 object-cover rounded" />
        <div class="flex-1">
          <div class="font-semibold">${escapeHtml(p.title)}</div>
          <div class="text-sm text-gray-300">Rp ${formatNumber(p.price)}</div>
          <div class="text-xs text-gray-400">Stok: ${p.stock}</div>
        </div>
      `;
      productList.appendChild(el);
    });

    // update chart dengan data sold / price contoh
    updateChart(data);
  } catch (e) {
    console.error(e);
    productList.innerHTML = '<div class="col-span-full text-center text-red-400 py-8">Gagal ambil produk</div>';
    updateChart([]);
  }
}

refreshBtn.addEventListener('click', loadProducts);

// helper
function formatNumber(n){ return new Intl.NumberFormat('id-ID').format(n || 0); }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* Chart */
let chart = null;
function updateChart(items){
  const ctx = document.getElementById('salesChart').getContext('2d');
  const labels = items.map(i => i.title.slice(0,12));
  const values = items.map(i => Number(i.sold || 0));
  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
    return;
  }
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Terjual',
        data: values,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// initial
loadProducts();
