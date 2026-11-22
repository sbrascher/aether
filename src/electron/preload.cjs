const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('musicApi', {
  getDataDir: () => ipcRenderer.invoke('app:getDataDir'),
  selectDataDir: () => ipcRenderer.invoke('app:selectDataDir'),
  getStats: () => ipcRenderer.invoke('db:stats'),
  queryTracks: (opts) => ipcRenderer.invoke('db:tracks', opts),
  getArtists: () => ipcRenderer.invoke('db:artists'),
  getAlbums: () => ipcRenderer.invoke('db:albums'),
  getGenres: () => ipcRenderer.invoke('db:genres'),
  getTopPlayed: (limit) => ipcRenderer.invoke('db:topPlayed', limit),
  toggleFavorite: (trackUid) => ipcRenderer.invoke('db:toggleFavorite', trackUid),
  incrementPlayCount: (trackUid) => ipcRenderer.invoke('db:incrementPlay', trackUid),
  getHistory: (limit) => ipcRenderer.invoke('db:history', limit),
  getTracksByUids: (uids) => ipcRenderer.invoke('db:tracksByUids', uids),
  getPlaylists: () => ipcRenderer.invoke('db:playlists'),
  createPlaylist: (name, description) => ipcRenderer.invoke('db:createPlaylist', name, description),
  deletePlaylist: (id) => ipcRenderer.invoke('db:deletePlaylist', id),
  getPlaylistTracks: (id) => ipcRenderer.invoke('db:playlistTracks', id),
  addTrackToPlaylist: (playlistId, trackUid) => ipcRenderer.invoke('db:addToPlaylist', playlistId, trackUid),
  removeTrackFromPlaylist: (playlistId, trackUid) => ipcRenderer.invoke('db:removeFromPlaylist', playlistId, trackUid),
});
