import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';

// 🔥 Import API_URL dari config
import { API_URL } from '../config';

const Ujian = () => {
  const { bidangId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { emit, on, off } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ujian, setUjian] = useState(null);
  const [soal, setSoal] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jawaban, setJawaban] = useState({});
  const [waktuTersisa, setWaktuTersisa] = useState(0);
  const [status, setStatus] = useState('sedang_berlangsung');
  const [ujianId, setUjianId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const timerRef = useRef(null);
  const visibilityRef = useRef(false);

  // Load data ujian
  useEffect(() => {
    const loadUjian = async () => {
      try {
        setLoading(true);
        
        // 🔥 Pakai API_URL
        const statusRes = await axios.get(
          `${API_URL}/ujian/${bidangId}/status`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = statusRes.data.data;
        
        if (data.ujian && data.ujian.status === 'selesai') {
          navigate('/dashboard');
          return;
        }

        if (!data.ujian || data.ujian.status === 'selesai') {
          if (data.sisa_percobaan <= 0) {
            setError('Batas percobaan sudah habis');
            setLoading(false);
            return;
          }
          await startUjian();
        } else {
          const ujianData = data.ujian;
          setUjianId(ujianData.id);
          setStatus(ujianData.status);
          
          // 🔥 Pakai API_URL
          const soalRes = await axios.get(
            `${API_URL}/bidang/${bidangId}/soal`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setSoal(soalRes.data.data);
          
          const durasi = ujianData.bidang.durasi_ujian;
          const mulai = new Date(ujianData.waktu_mulai);
          const elapsed = (Date.now() - mulai.getTime()) / 1000 / 60;
          const sisa = Math.max(0, durasi - elapsed);
          setWaktuTersisa(Math.floor(sisa));
          
          setUjian(ujianData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Load ujian error:', err);
        setError('Gagal memuat data ujian');
        setLoading(false);
      }
    };

    loadUjian();
  }, [bidangId]);

  // Start ujian baru
  const startUjian = async () => {
    try {
      // 🔥 Pakai API_URL
      const response = await axios.post(
        `${API_URL}/ujian/${bidangId}/mulai`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = response.data.data;
      setUjianId(data.ujian_id);
      setSoal(data.soal);
      setWaktuTersisa(data.durasi);
      setStatus('sedang_berlangsung');
      setUjian({ ...data, status: 'sedang_berlangsung' });
      setLoading(false);
    } catch (err) {
      console.error('Start ujian error:', err);
      setError(err.response?.data?.message || 'Gagal memulai ujian');
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (status !== 'sedang_berlangsung' || loading) return;

    timerRef.current = setInterval(() => {
      setWaktuTersisa((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 60000);

    return () => clearInterval(timerRef.current);
  }, [status, loading]);

  // Deteksi pindah tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && status === 'sedang_berlangsung' && ujianId) {
        handlePause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, ujianId]);

  // Socket listener untuk resume
  useEffect(() => {
    const handleResume = (data) => {
      if (data.ujianId === ujianId) {
        setStatus('sedang_berlangsung');
        setError('');
      }
    };

    on('ujian-resumed', handleResume);

    return () => {
      off('ujian-resumed');
    };
  }, [ujianId]);

  // Pause ujian
  const handlePause = async () => {
    if (!ujianId) return;
    
    try {
      // 🔥 Pakai API_URL
      await axios.put(
        `${API_URL}/ujian/${ujianId}/pause`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setStatus('di_pause');
      clearInterval(timerRef.current);
      
      emit('ujian-pause', {
        ujianId,
        userId: user.id,
        bidangId
      });
      
      setError('⏸️ Ujian di-pause karena pindah tab. Tunggu izin admin.');
    } catch (err) {
      console.error('Pause error:', err);
    }
  };

  // Submit ujian
  const handleSubmit = async () => {
    if (submitting) return;
    
    const totalDiisi = Object.keys(jawaban).length;
    const totalSoal = soal.length;
    
    if (totalDiisi < totalSoal) {
      const confirm = window.confirm(
        `Anda belum menjawab ${totalSoal - totalDiisi} soal. Yakin ingin submit?`
      );
      if (!confirm) return;
    }

    setSubmitting(true);
    clearInterval(timerRef.current);

    try {
      const jawabanList = Object.entries(jawaban).map(([soalId, jawab]) => ({
        soal_id: soalId,
        jawaban: jawab
      }));

      // 🔥 Pakai API_URL
      const response = await axios.post(
        `${API_URL}/ujian/${ujianId}/submit`,
        { jawaban: jawabanList },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const result = response.data.data;
      alert(`✅ Ujian selesai!\nSkor: ${result.skor}\nBenar: ${result.benar}/${result.total}`);
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Submit error:', err);
      setError('Gagal submit ujian');
      setSubmitting(false);
    }
  };

  // Pilih jawaban
  const handleJawaban = (soalId, pilihan) => {
    setJawaban((prev) => ({
      ...prev,
      [soalId]: pilihan
    }));
  };

  // Format waktu
  const formatTime = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}`;
  };

  const progress = soal.length > 0 ? (Object.keys(jawaban).length / soal.length) * 100 : 0;

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

  if (error && status !== 'di_pause') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="glass-card p-8 max-w-md text-center">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-xl font-semibold text-red-600">Error</h3>
            <p className="text-gray-500 mt-2">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary mt-4"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'di_pause') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="glass-card p-8 max-w-md text-center">
            <div className="text-5xl mb-4">⏸️</div>
            <h3 className="text-xl font-semibold text-yellow-600">Ujian Di-Pause</h3>
            <p className="text-gray-500 mt-2">
              {error || 'Admin sedang memproses izin untuk melanjutkan ujian.'}
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Tunggu sebentar, admin akan mengizinkan Anda melanjutkan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentSoal = soal[currentIndex];
  const pilihan = ['a', 'b', 'c', 'd', 'e'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="glass-card p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-gray-800">{ujian?.bidang?.nama || 'Ujian'}</h2>
              <p className="text-sm text-gray-500">
                Soal {currentIndex + 1} dari {soal.length}
              </p>
            </div>
            <div className="text-2xl font-bold text-primary-700 font-mono">
              ⏱️ {formatTime(waktuTersisa)}
            </div>
          </div>
          
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Progress: {Math.round(progress)}%</span>
            <span>Terjawab: {Object.keys(jawaban).length}/{soal.length}</span>
          </div>
        </div>

        {currentSoal && (
          <div className="glass-card p-6">
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">Soal {currentIndex + 1}</p>
              <h3 className="text-lg font-medium text-gray-800">
                {currentSoal.soal_text}
              </h3>
            </div>

            <div className="space-y-3">
              {pilihan.map((p) => {
                const label = p.toUpperCase();
                const value = currentSoal[`pilihan_${p}`];
                const isSelected = jawaban[currentSoal.id] === label;
                
                return (
                  <label
                    key={p}
                    className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`soal-${currentSoal.id}`}
                      value={label}
                      checked={isSelected}
                      onChange={() => handleJawaban(currentSoal.id, label)}
                      className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700">
                      <span className="font-medium">{label}.</span> {value}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className={`neu-button text-sm px-4 py-2 ${
                  currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                ◄ Prev
              </button>

              {currentIndex === soal.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Submitting...' : '✅ Submit Ujian'}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(soal.length - 1, prev + 1))}
                  className="btn-primary"
                >
                  Next ►
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ujian;
