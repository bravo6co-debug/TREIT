import React, { useState, useEffect } from 'react';
import { Gamepad2, Clock, Zap, Brain, Smartphone, TrendingUp, Palette } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useLevelStore } from '../lib/stores/levelStore';
import { toast } from 'sonner';

interface GameResult {
  score: number;
  maxScore: number;
  xpEarned: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: "SNS 마케팅에서 가장 중요한 요소는 무엇인가요?",
    options: ["좋은 콘텐츠", "많은 팔로워", "비싼 광고비", "예쁜 디자인"],
    correct: 0
  },
  {
    question: "해시태그 사용 시 가장 효과적인 개수는?",
    options: ["1-2개", "3-5개", "10개 이상", "상관없음"],
    correct: 1
  },
  {
    question: "인플루언서 마케팅의 핵심은?",
    options: ["높은 도달률", "신뢰성", "저렴한 비용", "빠른 확산"],
    correct: 1
  }
];

const HASHTAG_COMBINATIONS = [
  { category: "맛집", tags: ["#맛집", "#데이트", "#분위기좋은"], correct: true },
  { category: "패션", tags: ["#데일리룩", "#운동", "#헬스"], correct: false },
  { category: "여행", tags: ["#여행스타그램", "#힐링", "#맛집"], correct: true },
  { category: "뷰티", tags: ["#뷰티", "#스킨케어", "#여행"], correct: false }
];

const TREND_KEYWORDS = [
  { word: "MZ세대", trending: true, score: 100 },
  { word: "올드머니룩", trending: true, score: 80 },
  { word: "플렉스", trending: false, score: 20 },
  { word: "미니멀라이프", trending: true, score: 90 },
  { word: "욜로", trending: false, score: 10 }
];

const BRANDING_PROMPTS = [
  "친환경 화장품 브랜드의 슬로건을 만들어보세요",
  "MZ세대를 위한 패션 브랜드 슬로건",
  "건강한 먹거리 브랜드의 캐치프레이즈",
  "반려동물 용품 브랜드 슬로건"
];

interface XPBoosterGamesProps {
  onGameComplete?: (gameId: string, xpEarned: number) => void;
}

export default function XPBoosterGames({ onGameComplete }: XPBoosterGamesProps) {
  const { miniGames, playMiniGame, getAvailableMiniGames } = useLevelStore();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Timer for cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update cooldown times
  useEffect(() => {
    const updateCooldowns = () => {
      const now = new Date().getTime();
      miniGames.forEach(game => {
        if (game.cooldownUntil) {
          const remaining = Math.max(0, Math.floor((game.cooldownUntil.getTime() - now) / 1000));
          if (remaining > 0) {
            setTimeLeft(remaining);
          }
        }
      });
    };

    updateCooldowns();
    const interval = setInterval(updateCooldowns, 1000);
    return () => clearInterval(interval);
  }, [miniGames]);

  const startGame = (gameId: string) => {
    setActiveGame(gameId);
    
    switch (gameId) {
      case 'marketing_quiz':
        setGameState({
          currentQuestion: 0,
          score: 0,
          questions: QUIZ_QUESTIONS.sort(() => Math.random() - 0.5).slice(0, 3)
        });
        break;
      case 'hashtag_match':
        setGameState({
          combinations: HASHTAG_COMBINATIONS.sort(() => Math.random() - 0.5),
          currentIndex: 0,
          score: 0
        });
        break;
      case 'trend_prediction':
        setGameState({
          keywords: TREND_KEYWORDS.sort(() => Math.random() - 0.5),
          currentIndex: 0,
          score: 0
        });
        break;
      case 'branding_challenge':
        const prompt = BRANDING_PROMPTS[Math.floor(Math.random() * BRANDING_PROMPTS.length)];
        setGameState({
          prompt,
          userInput: '',
          completed: false
        });
        break;
    }
  };

  const handleGameAction = (action: any) => {
    const game = miniGames.find(g => g.id === activeGame);
    if (!game) return;

    switch (activeGame) {
      case 'marketing_quiz':
        handleQuizAnswer(action);
        break;
      case 'hashtag_match':
        handleHashtagMatch(action);
        break;
      case 'trend_prediction':
        handleTrendPrediction(action);
        break;
      case 'branding_challenge':
        handleBrandingSubmit(action);
        break;
    }
  };

  const handleQuizAnswer = (selectedAnswer: number) => {
    const { currentQuestion, score, questions } = gameState;
    const isCorrect = questions[currentQuestion].correct === selectedAnswer;
    const newScore = score + (isCorrect ? 1 : 0);

    if (currentQuestion + 1 >= questions.length) {
      finishGame('marketing_quiz', newScore, questions.length);
    } else {
      setGameState({
        ...gameState,
        currentQuestion: currentQuestion + 1,
        score: newScore
      });
    }
  };

  const handleHashtagMatch = (isCorrect: boolean) => {
    const { currentIndex, score, combinations } = gameState;
    const actuallyCorrect = combinations[currentIndex].correct;
    const newScore = score + (isCorrect === actuallyCorrect ? 1 : 0);

    if (currentIndex + 1 >= combinations.length) {
      finishGame('hashtag_match', newScore, combinations.length);
    } else {
      setGameState({
        ...gameState,
        currentIndex: currentIndex + 1,
        score: newScore
      });
    }
  };

  const handleTrendPrediction = (isTrending: boolean) => {
    const { currentIndex, score, keywords } = gameState;
    const keyword = keywords[currentIndex];
    const isCorrect = keyword.trending === isTrending;
    const newScore = score + (isCorrect ? keyword.score : 0);

    if (currentIndex + 1 >= keywords.length) {
      finishGame('trend_prediction', newScore, 500);
    } else {
      setGameState({
        ...gameState,
        currentIndex: currentIndex + 1,
        score: newScore
      });
    }
  };

  const handleBrandingSubmit = (input: string) => {
    if (input.trim().length < 5) {
      toast.error('슬로건은 최소 5글자 이상이어야 합니다.');
      return;
    }
    
    // Simple scoring based on length and creativity
    const score = Math.min(100, input.length * 2 + (input.includes('!') ? 20 : 0));
    finishGame('branding_challenge', score, 100);
  };

  const finishGame = (gameId: string, score: number, maxScore: number) => {
    const game = miniGames.find(g => g.id === gameId);
    if (!game) return;

    const successRate = score / maxScore;
    let xpEarned = Math.floor(game.xpReward * successRate);
    
    // Minimum XP guarantee
    if (xpEarned < game.xpReward * 0.3) {
      xpEarned = Math.floor(game.xpReward * 0.3);
    }

    const success = playMiniGame(gameId);
    
    if (success) {
      toast.success(
        `${game.title} 완료! +${xpEarned} XP 획득!`,
        { duration: 3000 }
      );
      
      onGameComplete?.(gameId, xpEarned);
    }

    setActiveGame(null);
    setGameState({});
  };

  const closeGame = () => {
    setActiveGame(null);
    setGameState({});
  };

  const formatCooldownTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGameIcon = (gameId: string) => {
    switch (gameId) {
      case 'marketing_quiz': return <Brain size={24} />;
      case 'hashtag_match': return <Smartphone size={24} />;
      case 'trend_prediction': return <TrendingUp size={24} />;
      case 'branding_challenge': return <Palette size={24} />;
      default: return <Gamepad2 size={24} />;
    }
  };

  if (activeGame) {
    return (
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
        {renderActiveGame()}
      </Card>
    );
  }

  const renderActiveGame = () => {
    const game = miniGames.find(g => g.id === activeGame);
    if (!game) return null;

    switch (activeGame) {
      case 'marketing_quiz':
        const { currentQuestion, questions, score } = gameState;
        const question = questions[currentQuestion];
        
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-900">{game.title}</h3>
              <Badge className="bg-purple-100 text-purple-800">
                {currentQuestion + 1}/{questions.length}
              </Badge>
            </div>
            
            <div className="mb-4">
              <Progress value={(currentQuestion / questions.length) * 100} className="mb-2" />
              <p className="text-sm text-purple-700">점수: {score}/{questions.length}</p>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-medium text-purple-900 mb-4">{question.question}</h4>
              <div className="space-y-2">
                {question.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4 border-purple-200 hover:bg-purple-50"
                    onClick={() => handleGameAction(index)}
                  >
                    <span className="font-semibold text-purple-700 mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </Button>
                ))}
              </div>
            </div>
            
            <Button variant="ghost" onClick={closeGame} className="text-purple-700">
              게임 종료
            </Button>
          </div>
        );

      case 'hashtag_match':
        const { currentIndex, combinations } = gameState;
        const combination = combinations[currentIndex];
        
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-900">{game.title}</h3>
              <Badge className="bg-purple-100 text-purple-800">
                {currentIndex + 1}/{combinations.length}
              </Badge>
            </div>
            
            <div className="mb-6 text-center">
              <h4 className="text-xl font-bold text-purple-900 mb-4">{combination.category}</h4>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {combination.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-lg px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-purple-700 mb-4">이 해시태그 조합이 적절한가요?</p>
              
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleGameAction(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-8"
                >
                  적절함
                </Button>
                <Button
                  onClick={() => handleGameAction(false)}
                  className="bg-red-500 hover:bg-red-600 text-white px-8"
                >
                  부적절함
                </Button>
              </div>
            </div>
          </div>
        );

      case 'trend_prediction':
        const { keywords } = gameState;
        const keyword = keywords[gameState.currentIndex];
        
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-900">{game.title}</h3>
              <Badge className="bg-purple-100 text-purple-800">
                {gameState.currentIndex + 1}/{keywords.length}
              </Badge>
            </div>
            
            <div className="mb-6 text-center">
              <h4 className="text-2xl font-bold text-purple-900 mb-4">"{keyword.word}"</h4>
              <p className="text-purple-700 mb-6">이 키워드가 현재 트렌드인가요?</p>
              
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleGameAction(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-8"
                >
                  <TrendingUp className="mr-2" size={16} />
                  트렌드
                </Button>
                <Button
                  onClick={() => handleGameAction(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-8"
                >
                  구식
                </Button>
              </div>
            </div>
          </div>
        );

      case 'branding_challenge':
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-900">{game.title}</h3>
            </div>
            
            <div className="mb-6">
              <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
                <p className="text-purple-900 font-medium">{gameState.prompt}</p>
              </div>
              
              <textarea
                className="w-full p-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[100px]"
                placeholder="창의적인 슬로건을 작성해보세요..."
                value={gameState.userInput || ''}
                onChange={(e) => setGameState({ ...gameState, userInput: e.target.value })}
              />
              
              <div className="flex gap-4 mt-4">
                <Button
                  onClick={() => handleGameAction(gameState.userInput)}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                  disabled={!gameState.userInput?.trim()}
                >
                  제출하기
                </Button>
                <Button variant="outline" onClick={closeGame}>
                  취소
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-center mb-4">
        <Gamepad2 size={24} className="text-purple-600 mr-3" />
        <h3 className="text-lg font-semibold text-purple-900">XP 부스터 게임</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {miniGames.map((game) => {
          const now = new Date();
          const isAvailable = !game.cooldownUntil || now >= game.cooldownUntil;
          const cooldownSeconds = game.cooldownUntil 
            ? Math.max(0, Math.floor((game.cooldownUntil.getTime() - now.getTime()) / 1000))
            : 0;
            
          return (
            <Card 
              key={game.id} 
              className={`p-4 transition-all ${
                isAvailable 
                  ? 'cursor-pointer hover:shadow-md border-purple-200 hover:border-purple-300 bg-white' 
                  : 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-50'
              }`} 
              onClick={() => isAvailable && startGame(game.id)}
            >
              <div className="text-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2 ${
                  isAvailable ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'
                }`}>
                  {getGameIcon(game.id)}
                </div>
                <h4 className="font-semibold text-sm mb-1 text-gray-900">{game.title}</h4>
                <p className="text-xs text-gray-600 mb-3">{game.description}</p>
                
                {isAvailable ? (
                  <Badge className="bg-purple-100 text-purple-800">
                    <Zap size={12} className="mr-1" />
                    +{game.xpReward} XP
                  </Badge>
                ) : (
                  <Badge className="bg-gray-200 text-gray-600">
                    <Clock size={12} className="mr-1" />
                    {formatCooldownTime(cooldownSeconds)}
                  </Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}