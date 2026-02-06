import api from './api';

const getMenus = () => api.get('/menus').then(res => res);
const createMenu = (payload) => api.post('/menus', payload).then(res => res);
const updateMenu = (id, payload) => api.put(`/menus/${id}`, payload).then(res => res);
const deleteMenu = (id) => api.delete(`/menus/${id}`).then(res => res);

export default { getMenus, createMenu, updateMenu, deleteMenu };
