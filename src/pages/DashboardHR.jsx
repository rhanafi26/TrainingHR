import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';

const DashboardHR = () => {
  const [bidangList, setBidangList] = useState([]);
  const [hasilList, setHasilList] = useState([]);
  const [bidangOptions, setBidangOptions] = useState([]);
  const [filterBidang, setFilterBidang] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'bidang', 'materi', 'soal'
  const [selectedBidang, setSelectedBidang] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const { token } = useAuth();
  const { emit, on, off } = useSocket();

  // Form states
  const [formBidang, setFormBidang] = useState({
    nama: '',
    deskripsi: '',
    durasi_ujian: 60
  });
  const [formMateri, setFormMateri] = useState({
    judul: '',
    file: null
  });
  const [formSoal, setFormSoal] = useState({
    file: null
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [filterBidang]);

  // Socket listener untuk notifikasi pause
  useEffect(() => {
    const handleNotifikasiPause = (data) => {
      setNotifications((prev) => [
        {
          id: Date.now(),
          ...data,
          timestamp: new Date()
        },
        ...prev
      ]);
    };

    const handleNotifikasiResume = (data) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.ujianId === data.ujianId
            ? { ...n, resolved: true, resolvedAt: new Date() }
            : n
        )
      );
    };

    on('notifikasi-pause', handleNotifikasiPause);
    on('notifikasi-resume', handleNotifikasiResume);

    return () => {
      off('notifikasi-pause');
      off('notifikasi-resume');
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch bidang
      const bidangRes = await axios.get('http://localhost:5001/api/bidang', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBidangList(bidangRes.data.data);

      // Fetch hasil dengan filter
      const hasilRes = await axios.get(
        `http://localhost:5001/api/hasil${filterBidang ? `?bidangId=${filterBidang}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHasilList(hasilRes.data.data);

      // Fetch bidang options untuk filter
      const optionsRes = await axios.get('http://localhost:5001/api/hasil/bidang-list', {
        headers: { Authorization: `Bearer ${token}` } 
      });
      setBidangOptions(optionsRes.data.data);

      setError('');
    } catch (err) {
      console.error('Fetch data error:', err);
      setError('Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  };

  // Create Bidang
  const handleCreateBidang = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        'http://localhost:5001/api/bidang',
        formBidang,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowModal(false);
      setFormBidang({ nama: '', deskripsi: '', durasi_ujian: 60 });
      fetchData();
      alert('✅ Bidang berhasil dibuat!');
    } catch (err) {
      alert('❌ Gagal membuat bidang: ' + (err.response?.data?.message || err.message));
    }
  };

  // Upload Materi
  const handleUploadMateri = async (e) => {
    e.preventDefault();
    if (!selectedBidang) return;

    const formData = new FormData();
    formData.append('materi', formMateri.file);
    formData.append('judul', formMateri.judul);

    try {
      await axios.post(
        `http://localhost:5001/api/bidang/${selectedBidang.id}/materi`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setShowModal(false);
      setFormMateri({ judul: '', file: null });
      fetchData();
      alert('✅ Materi berhasil diupload!');
    } catch (err) {
      alert('❌ Gagal upload materi: ' + (err.response?.data?.message || err.message));
    }
  };

  // Upload Soal
  const handleUploadSoal = async (e) => {
    e.preventDefault();
    if (!selectedBidang) return;

    const formData = new FormData();
    formData.append('soal', formSoal.file);

    try {
      await axios.post(
        `http://localhost:5001/api/bidang/${selectedBidang.id}/soal`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setShowModal(false);
      setFormSoal({ file: null });
      fetchData();
      alert('✅ Soal berhasil diupload!');
    } catch (err) {
      alert('❌ Gagal upload soal: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle Resume Ujian
  const handleResumeUjian = async (ujianId, userId) => {
    try {
      await axios.put(
        `http://localhost:5001/api/ujian/${ujianId}/resume`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Kirim event via socket
      emit('ujian-resume', { ujianId, userId });
      
      // Update notifikasi
      setNotifications((prev) =>
        prev.map((n) =>
          n.ujianId === ujianId
            ? { ...n, resolved: true, resolvedAt: new Date() }
            : n
        )
      );
      
      alert('✅ Ujian dilanjutkan!');
    } catch (err) {
      alert('❌ Gagal resume ujian: ' + (err.response?.data?.message || err.message));
    }
  };

  // Export Excel
  const handleExport = async () => {
    try {
      const url = `http://localhost:5001/api/hasil/export${filterBidang ? `?bidangId=${filterBidang}` : ''}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `hasil-ujian-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('❌ Gagal export: ' + (err.response?.data?.message || err.message));
    }
  };

  const openModal = (type, bidang = null) => {
    setModalType(type);
    setSelectedBidang(bidang);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-primary-500 text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Notifikasi */}
        {notifications.filter(n => !n.resolved).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">🔔 Notifikasi ({notifications.filter(n => !n.resolved).length})</h3>
            <div className="space-y-2">
              {notifications.filter(n => !n.resolved).map((notif) => (
                <div key={notif.id} className="glass-card p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-yellow-700">⚠️ User {notif.userId} mempause ujian</p>
                    <p className="text-xs text-gray-400">
                      {new Date(notif.timestamp).toLocaleTimeString('id-ID')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResumeUjian(notif.ujianId, notif.userId)}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    ▶️ Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary-700">Dashboard HR</h2>
          <button
            onClick={() => openModal('bidang')}
            className="btn-primary"
          >
            + Tambah Bidang
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* List Bidang */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {bidangList.map((bidang) => (
            <div key={bidang.id} className="glass-card p-4">
              <h4 className="font-semibold text-gray-800">{bidang.nama}</h4>
              <p className="text-xs text-gray-400 mt-1">
                {bidang._count?.soal || 0} soal • {bidang.durasi_ujian} menit
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => openModal('materi', bidang)}
                  className="neu-button text-xs px-3 py-1"
                >
                  📄 Upload Materi
                </button>
                <button
                  onClick={() => openModal('soal', bidang)}
                  className="neu-button text-xs px-3 py-1"
                >
                  📝 Upload Soal
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Hasil Ujian */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">📋 Hasil Ujian</h3>
            <div className="flex gap-3">
              <select
                value={filterBidang}
                onChange={(e) => setFilterBidang(e.target.value)}
                className="input-field text-sm py-2 w-40"
              >
                <option value="">Semua Bidang</option>
                {bidangOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.nama}</option>
                ))}
              </select>
              <button
                onClick={handleExport}
                className="neu-button text-sm px-4 py-2"
              >
                Export Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Nama</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Email</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Bidang</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Skor</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Percobaan</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {hasilList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-gray-400">
                      Belum ada hasil ujian
                    </td>
                  </tr>
                ) : (
                  hasilList.map((h) => (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2 px-3">{h.nama}</td>
                      <td className="py-2 px-3 text-gray-500">{h.email}</td>
                      <td className="py-2 px-3">{h.bidang}</td>
                      <td className={`py-2 px-3 font-semibold ${
                        h.skor >= 80 ? 'text-green-600' :
                        h.skor >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {h.skor}
                      </td>
                      <td className="py-2 px-3 text-gray-500">Ke-{h.percobaan_ke}</td>
                      <td className="py-2 px-3 text-gray-400 text-xs">
                        {new Date(h.tanggal).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {modalType === 'bidang' && 'Tambah Bidang Baru'}
                {modalType === 'materi' && `Upload Materi - ${selectedBidang?.nama}`}
                {modalType === 'soal' && `Upload Soal - ${selectedBidang?.nama}`}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {modalType === 'bidang' && (
              <form onSubmit={handleCreateBidang} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Bidang *
                  </label>
                  <input
                    type="text"
                    value={formBidang.nama}
                    onChange={(e) => setFormBidang({ ...formBidang, nama: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={formBidang.deskripsi}
                    onChange={(e) => setFormBidang({ ...formBidang, deskripsi: e.target.value })}
                    className="input-field"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durasi Ujian (menit) *
                  </label>
                  <input
                    type="number"
                    value={formBidang.durasi_ujian}
                    onChange={(e) => setFormBidang({ ...formBidang, durasi_ujian: parseInt(e.target.value) })}
                    className="input-field"
                    min="10"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  Buat Bidang
                </button>
              </form>
            )}

            {modalType === 'materi' && (
              <form onSubmit={handleUploadMateri} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Judul Materi *
                  </label>
                  <input
                    type="text"
                    value={formMateri.judul}
                    onChange={(e) => setFormMateri({ ...formMateri, judul: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File PDF *
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFormMateri({ ...formMateri, file: e.target.files[0] })}
                    className="input-field"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Maksimal 10MB</p>
                </div>
                <button type="submit" className="btn-primary w-full">
                  Upload Materi
                </button>
              </form>
            )}

            {modalType === 'soal' && (
              <form onSubmit={handleUploadSoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File Excel Soal *
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setFormSoal({ file: e.target.files[0] })}
                    className="input-field"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Format: Soal | A | B | C | D | E | Jawaban
                  </p>
                  <p className="text-xs text-gray-400">Minimal 10 soal, maksimal 50 soal</p>
                </div>
                <button type="submit" className="btn-primary w-full">
                  Upload Soal
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHR;