import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

// 🔥 Import API_URL dari config
import { API_URL } from '../config';

const Riwayat = () => {
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    fetchRiwayat();
  }, []);

  const fetchRiwayat = async () => {
    try {
      // 🔥 Pakai API_URL
      const response = await axios.get(
        `${API_URL}/user/riwayat`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRiwayat(response.data.data);
    } catch (err) {
      console.error('Fetch riwayat error:', err);
      setError('Gagal mengambil data riwayat');
    } finally {
      setLoading(false);
    }
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
      
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-primary-700 mb-6">
          📊 Riwayat Ujian
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {riwayat.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-600">Belum Ada Riwayat</h3>
            <p className="text-gray-400 mt-2">Anda belum menyelesaikan ujian apapun</p>
          </div>
        ) : (
          <div className="space-y-4">
            {riwayat.map((item) => (
              <div key={item.id} className="glass-card p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-800">{item.bidang.nama}</h4>
                  <div className="flex gap-4 text-sm text-gray-500 mt-1">
                    <span>Percobaan ke-{item.percobaan_ke}</span>
                    <span>•</span>
                    <span>
                      {item.waktu_selesai 
                        ? new Date(item.waktu_selesai).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '-'
                      }
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    item.skor >= 80 ? 'text-green-600' :
                    item.skor >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {item.skor}
                  </div>
                  <div className="text-xs text-gray-400">Skor</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Riwayat;
