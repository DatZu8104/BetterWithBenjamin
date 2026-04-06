'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, BookOpen, Library, GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Định nghĩa kiểu dữ liệu trả về từ API
interface ProgressData {
  systemWords: any[];
  customWords: any[];
  stats: {
    totalSystem: number;
    learnedSystem: number;
    totalCustom: number;
    learnedCustom: number;
  };
}

interface UserDetailsProps {
  userId: string;
  username: string;
}

export default function UserDetails({ userId, username }: UserDetailsProps) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tự động gọi API mỗi khi chọn User khác (userId thay đổi)
  useEffect(() => {
    const fetchProgress = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.getUserProgress(userId);
        setData(res);
      } catch (err) {
        console.error(err);
        setError('Không thể tải dữ liệu tiến độ của người dùng này.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchProgress();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center gap-2 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p>Đang tải dữ liệu của {username}...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-center p-6 text-red-400 text-center">
        <AlertCircle className="w-8 h-8 mb-2 mx-auto" />
        <p>{error}</p>
      </div>
    );
  }

  const { stats, customWords, systemWords } = data;
  
  // Tính % tiến độ
  const systemPercent = stats.totalSystem > 0 ? Math.round((stats.learnedSystem / stats.totalSystem) * 100) : 0;
  const customPercent = stats.totalCustom > 0 ? Math.round((stats.learnedCustom / stats.totalCustom) * 100) : 0;
  const totalLearned = stats.learnedSystem + stats.learnedCustom;

  return (
    <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 sm:p-6 h-full flex flex-col max-h-[80vh] overflow-hidden">
      <div className="flex justify-between items-end mb-6 shrink-0 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            Hồ sơ học tập: <span className="text-blue-400">{username}</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-1 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4" /> Tổng số từ đã thuộc: <strong className="text-white">{totalLearned} từ</strong>
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3 bg-black border border-zinc-800 shrink-0">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="system">Từ hệ thống ({stats.totalSystem})</TabsTrigger>
          <TabsTrigger value="custom">Từ cá nhân ({stats.totalCustom})</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: TỔNG QUAN (CHART/PROGRESS) */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto mt-4 space-y-4 custom-scrollbar pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box Từ Hệ Thống */}
            <Card className="bg-black border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400 flex justify-between items-center">
                  <span className="flex items-center gap-2"><Library className="w-4 h-4 text-purple-400"/> Hệ thống Oxford</span>
                  <span className="text-white font-bold">{stats.learnedSystem} / {stats.totalSystem}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={systemPercent} className="h-2 bg-zinc-800 [&>div]:bg-purple-500" />
                <p className="text-xs text-zinc-500 mt-2 text-right">Hoàn thành {systemPercent}%</p>
              </CardContent>
            </Card>

            {/* Box Từ Tự Tạo */}
            <Card className="bg-black border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400 flex justify-between items-center">
                  <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-400"/> Từ vựng tự thêm</span>
                  <span className="text-white font-bold">{stats.learnedCustom} / {stats.totalCustom}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={customPercent} className="h-2 bg-zinc-800 [&>div]:bg-blue-500" />
                <p className="text-xs text-zinc-500 mt-2 text-right">Hoàn thành {customPercent}%</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl">
             <h3 className="font-bold text-blue-400 mb-2">Đánh giá chung</h3>
             <p className="text-sm text-zinc-300">
                {totalLearned === 0 ? "Người dùng này chưa học từ nào. Cần khuyến khích thêm!" : 
                 totalLearned < 50 ? "Người dùng đang ở những bước đầu tiên của hành trình." :
                 "Tiến độ học tập rất tốt. Duy trì phát huy!"}
             </p>
          </div>
        </TabsContent>

        {/* TAB 2: TỪ HỆ THỐNG */}
        <TabsContent value="system" className="flex-1 overflow-y-auto mt-4 custom-scrollbar pr-2 space-y-2">
          {systemWords.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">Chưa lưu từ vựng hệ thống nào.</p>
          ) : (
            systemWords.map((word) => (
              <div key={word._id} className="flex justify-between items-center p-3 rounded-lg border border-zinc-800 bg-black">
                <div>
                  <p className="font-bold text-white text-base">{word.word} <span className="text-xs text-zinc-500 font-normal ml-2">{word.pos} • {word.ipa}</span></p>
                  <p className="text-sm text-zinc-400 mt-0.5 truncate max-w-[200px] sm:max-w-[300px]">{word.meaning}</p>
                </div>
                {word.learned && <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Đã học</Badge>}
              </div>
            ))
          )}
        </TabsContent>

        {/* TAB 3: TỪ CÁ NHÂN */}
        <TabsContent value="custom" className="flex-1 overflow-y-auto mt-4 custom-scrollbar pr-2 space-y-2">
           {customWords.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">Chưa có từ vựng tự thêm nào.</p>
          ) : (
            customWords.map((word) => (
              <div key={word._id} className="flex justify-between items-center p-3 rounded-lg border border-zinc-800 bg-black">
                <div>
                  <p className="font-bold text-white text-base">{word.word}</p>
                  <p className="text-sm text-zinc-400 mt-0.5 truncate max-w-[200px] sm:max-w-[300px]">{word.meaning}</p>
                </div>
                {word.learned && <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Đã học</Badge>}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}