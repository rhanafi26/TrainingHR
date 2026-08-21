import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';

// 🔥 Import API_URL dari config
import { API_URL } from '../config';

const DashboardUser = () => {
  const [bidangList, setBidangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const { on, off } = useSocket();

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboard();
  }, []);

  // Socket listener untuk notifikasi resume
  useEffect(() => {
    const handleResume = (data) => {
      console.log('📢 Ujian di-resume:', data);
      fetchDashboard();
    };

    on('ujian-resumed', handleResume);

    return () => {
      off('ujian-resumed');
    };
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      // 🔥 Pakai API_URL dari config
      const response = await axios.get(`${API_URL}/user/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBidangList(response.data.data);
      setError('');
    } catch (err) {
      console.error('Fetch dashboard error:', err);
      setError('Gagal mengambil data dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Format status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      'belum_mulai': { label: 'Belum Mulai', className: 'badge-belum-mulai' },
      'sedang_berlangsung': { label: 'Sedang Berjalan', className: 'badge-sedang-berlangsung' },
      'di_pause': { label: 'Di-Pause', className: 'badge-di-pause' },
      'selesai': { label: 'Selesai', className: 'badge-selesai' }
    };
    return statusMap[status] || statusMap['belum_mulai'];
  };

  // 🔥 Download Materi - pakai API_URL
  const downloadMateri = (materiId, judul) => {
    const url = `${API_URL}/user/materi/${materiId}/download?token=${token}`;
    window.open(url, '_blank');
  };

  // Render tombol aksi berdasarkan status
  const renderActionButton = (bidang) => {
    if (bidang.status === 'selesai') {
      return (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500">
            Skor: {bidang.skor} | {bidang.percobaan_ke}/3
          </span>
          {bidang.sisa_percobaan > 0 && (
            <Link
              to={`/ujian/${bidang.id}`}
              className="neu-button text-sm px-4 py-2"
            >
              Ujian Ulang ({bidang.sisa_percobaan}x)
            </Link>
          )}
        </div>
      );
    }

    if (bidang.status === 'sedang_berlangsung' || bidang.status === 'di_pause') {
      return (
        <Link
          to={`/ujian/${bidang.id}`}
          className="btn-primary text-sm px-4 py-2"
        >
          {bidang.status === 'di_pause' ? '⏸️ Lanjutkan' : '▶️ Lanjutkan'}
        </Link>
      );
    }

    if (bidang.bisa_mulai) {
      return (
        <Link
          to={`/ujian/${bidang.id}`}
          className="btn-primary text-sm px-4 py-2"
        >
          🚀 Mulai Ujian
        </Link>
      );
    }

    return (
      <span className="text-sm text-gray-400">
        {bidang.sisa_percobaan === 0 ? 'Batas percobaan habis' : 'Belum tersedia'}
      </span>
    );
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
      
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-primary-700">
            📚 Dashboard Training
          </h2>
          <Link to="/riwayat" className="neu-button text-sm px-4 py-2">
            Riwayat Ujian
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* List Bidang */}
        {bidangList.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-600">Belum Ada Bidang</h3>
            <p className="text-gray-400 mt-2">Belum ada bidang training yang tersedia</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bidangList.map((bidang) => {
              const status = getStatusBadge(bidang.status);
              return (
                <div key={bidang.id} className="glass-card p-6 hover:shadow-xl transition-all duration-300">
                  {/* Header Card */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {bidang.nama}
                    </h3>
                    <span className={`badge ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Deskripsi */}
                  {bidang.deskripsi && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {bidang.deskripsi}
                    </p>
                  )}

                  {/* Info */}
                  <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                    <span>⏱️ {bidang.durasi_ujian} menit</span>
                    <span>📝 {bidang.total_soal || 0} soal</span>
                    <span>📄 {bidang.total_materi || 0} materi</span>
                  </div>

                  {/* Materi */}
                  {bidang.materi && bidang.materi.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">📄 Materi:</p>
                      <div className="flex flex-wrap gap-2">
                        {bidang.materi.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => downloadMateri(m.id, m.judul)}
                            className="text-xs bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-300 transition-colors cursor-pointer"
                          >
                            {m.judul}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex flex-wrap justify-between items-center mt-2 pt-3 border-t border-gray-100 gap-2">
                    <span className="text-xs text-gray-400">
                      {bidang.status === 'selesai' 
                        ? `Percobaan ${bidang.percobaan_ke}/3` 
                        : bidang.sisa_percobaan > 0 
                          ? `Sisa ${bidang.sisa_percobaan}x percobaan` 
                          : 'Batas percobaan habis'
                      }
                    </span>
                    {renderActionButton(bidang)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardUser;
