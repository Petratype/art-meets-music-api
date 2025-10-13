// Elements
const searchBtn = document.getElementById('searchButton');
const surpriseBtn = document.getElementById('surpriseButton');
const artistInput = document.getElementById('artistInput');
const musicResult = document.getElementById('musicResult');
const artResult = document.getElementById('artResult');
const messageEl = document.getElementById('connectionMessage');
const toggleBtn = document.getElementById('toggleTheme');

// Helpers
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// iTunes search: returns results array
async function searchItunes(term, limit = 10) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=musicTrack&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('iTunes fetch failed');
  const data = await res.json();
  return data.results || [];
}

// Get a random artwork that has image_id
async function getRandomArtwork() {
  // try several random pages to increase chance of valid image
  for (let attempt = 0; attempt < 6; attempt++) {
    const page = Math.floor(Math.random() * 100) + 1;
    const url = `https://api.artic.edu/api/v1/artworks?page=${page}&limit=20&fields=id,title,image_id,artist_display,date_display,term_titles,artwork_type_title`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    const items = (data.data || []).filter(i => i.image_id);
    if (items.length) return pick(items);
  }
  return null;
}

// Build connection message (3 lines): mostly about art, small note about artist/music
function buildMessage(art, track) {
  const line1 = `${art.title}${art.date_display ? ` (${art.date_display})` : ''} — ${art.artist_display || 'Unknown artist'}.`;
  const feature = (art.term_titles && art.term_titles[0]) || art.artwork_type_title || 'composition and color';
  const line2 = `This work focuses on ${feature.toLowerCase()}, composition and visual mood.`;
  const line3 = track
    ? `Related note: the soundtrack "${track.trackName}" by ${track.artistName} shares mood elements (genre: ${track.primaryGenreName || 'unknown'}).`
    : `Related note: try searching an artist to compare their music with this work.`;
  return `${line1}\n${line2}\n${line3}`;
}

// Display helpers
function showMusicCard(track) {
  if (!track) {
    musicResult.innerHTML = '<p>No music found for that query.</p>';
    return;
  }
  const artwork = track.artworkUrl100 || '';
  const audio = track.previewUrl ? `<audio controls src="${track.previewUrl}"></audio>` : '';
  musicResult.innerHTML = `
    <h3>${track.artistName}</h3>
    ${artwork ? `<img src="${artwork}" alt="Album art">` : ''}
    <p><strong>Track:</strong> ${track.trackName || '—'} ${track.collectionName ? `• ${track.collectionName}` : ''}</p>
    <p><em>${track.primaryGenreName || ''}</em></p>
    ${audio}
  `;
}

function showArtCard(art) {
  if (!art) {
    artResult.innerHTML = '<p>No artwork available.</p>';
    return;
  }
  const imageUrl = `https://www.artic.edu/iiif/2/${art.image_id}/full/843,/0/default.jpg`;
  artResult.innerHTML = `
    <h3>${art.title}</h3>
    <img src="${imageUrl}" alt="${art.title}">
    <p>${art.artist_display || 'Unknown artist'}</p>
    <p>${art.artwork_type_title ? art.artwork_type_title : ''}</p>
  `;
}

// MAIN: Search by artist -> random artwork
searchBtn.addEventListener('click', async () => {
  const artist = artistInput.value.trim();
  if (!artist) return;
  musicResult.innerHTML = 'Loading...';
  artResult.innerHTML = 'Loading...';
  messageEl.textContent = '';

  try {
    // 1) find music tracks for artist (iTunes)
    const tracks = await searchItunes(artist, 10);
    const track = tracks.length ? tracks[0] : null; // pick first (best match)
    showMusicCard(track);

    // 2) pick random artwork
    const art = await getRandomArtwork();
    showArtCard(art);

    // 3) build message focused on art (90%) with small music note (10%)
    messageEl.textContent = buildMessage(art || {}, track);
  } catch (err) {
    console.error(err);
    musicResult.innerHTML = '<p>Error loading data.</p>';
    artResult.innerHTML = '<p>Error loading data.</p>';
    messageEl.textContent = '';
  }
});

// Surprise Pairing: random artwork -> search iTunes by keyword from artwork.title
surpriseBtn.addEventListener('click', async () => {
  musicResult.innerHTML = 'Loading...';
  artResult.innerHTML = 'Loading...';
  messageEl.textContent = '';

  try {
    const art = await getRandomArtwork();
    showArtCard(art);

    if (!art) {
      musicResult.innerHTML = '<p>No artwork found.</p>';
      return;
    }

    // pick a keyword from artwork title (avoid tiny words)
    const words = (art.title || '').split(/\s+/).filter(w => w.length > 3);
    const searchTerm = words.length ? pick(words) : 'music';

    // search iTunes for that term and pick a random track
    const tracks = await searchItunes(searchTerm, 15);
    const track = tracks.length ? pick(tracks) : null;
    showMusicCard(track);

    messageEl.textContent = buildMessage(art, track);
  } catch (err) {
    console.error(err);
    musicResult.innerHTML = '<p>Error loading data.</p>';
    artResult.innerHTML = '<p>Error loading data.</p>';
    messageEl.textContent = '';
  }
});

// Simple theme toggle (dark/light). You said you prefer dark mode by default.
toggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  toggleBtn.textContent = document.body.classList.contains('light-mode') ? 'Dark' : 'Light';
});
