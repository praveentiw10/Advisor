let SYMBOL = "MSFT";
let chart;
const API_KEY = 'd60plgpr01qto1rdvorgd60plgpr01qto1rdvos0'; 
const socket = new WebSocket(`wss://ws.finnhub.io?token=${API_KEY}`);


const ctx = document.getElementById("marketChart").getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, 400);
gradient.addColorStop(0, 'rgba(34, 211, 238, 0.25)');
gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');

chart = new Chart(ctx, {
    type: "line",
    data: {
        labels: [],
        datasets: [{
            data: [],
            borderColor: "#22d3ee",
            borderWidth: 3,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointRadius: 0
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { color: "#64748b" } },
            y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#64748b" } }
        }
    }
});


async function fetchInitialData(symbol) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`);
        const data = await response.json();
        
        document.getElementById("price").innerText = `$${data.c.toFixed(2)}`;
        document.getElementById("high").innerText = `$${data.h.toFixed(2)}`;
        
        const change = data.dp.toFixed(2);
        const changeEl = document.getElementById("change");
        changeEl.innerText = `${change > 0 ? '+' : ''}${change}%`;
        changeEl.className = `stat-value ${change >= 0 ? 'price-up' : 'price-down'}`;
    } catch (err) {
        console.error("Error fetching quotes:", err);
    }
}


socket.addEventListener('open', () => {
    socket.send(JSON.stringify({'type':'subscribe', 'symbol': SYMBOL}));
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'trade') {
        const lastTrade = data.data[0];
        const newPrice = lastTrade.p.toFixed(2);
        const time = new Date(lastTrade.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

       
        document.getElementById("price").innerText = `$${newPrice}`;
        
        
        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.data.labels.push(time);
        chart.data.datasets[0].data.push(newPrice);
        chart.update('none');
    }
});


function openOverlay() {
    const el = document.getElementById("stockOverlay");
    el.style.display = "flex";
    setTimeout(() => el.classList.add("active"), 10);
}

function closeOverlay() {
    const el = document.getElementById("stockOverlay");
    el.classList.remove("active");
    setTimeout(() => el.style.display = "none", 300);
}

function changeStock(sym, name) {
    
    socket.send(JSON.stringify({'type':'unsubscribe', 'symbol': SYMBOL}));
    SYMBOL = sym;
    socket.send(JSON.stringify({'type':'subscribe', 'symbol': SYMBOL}));

    document.getElementById("symbol").innerText = SYMBOL;
    document.getElementById("chart-title").innerText = `${SYMBOL} Price Performance`;
    
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
    
    fetchInitialData(sym);
    closeOverlay();
}

fetchInitialData(SYMBOL);