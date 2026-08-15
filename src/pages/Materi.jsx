import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Materi = () => {
  const { bidangId } = useParams();
  const [bidang, setBidang] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    fetchMateri();
  }, [bidangId]);

  const fetchMateri = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/user/bidang/${bidangId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBidang(response.data.data);
    } catch (err) {
      console.error('Fetch materi error:', err);
      setError('Gagal mengambil data materi');
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
        <div className="mb-6">
          <Link to="/dashboard" className="text-primary-500 hover:underline text-sm">
            ← Kembali ke Dashboard
          </Link>
          <h2 className="text-2xl font-bold text-primary-700 mt-2">
            📄 Materi: {bidang?.nama}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {bidang?.materi?.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-600">Belum Ada Materi</h3>
            <p className="text-gray-400 mt-2">Belum ada materi yang diupload untuk bidang ini</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bidang?.materi?.map((m) => (
              <div key={m.id} className="glass-card p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-800">{m.judul}</h4>
                  <p className="text-xs text-gray-400">
                    Diupload: {new Date(m.uploaded_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <a
                  href={`http://localhost:5001/api/user/materi/${m.id}/download`}
                  className="btn-primary text-sm px-4 py-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📥 Download PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Materi;