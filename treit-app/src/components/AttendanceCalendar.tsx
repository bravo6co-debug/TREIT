import React from 'react';
import { Calendar, Check, X, Star, Zap } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useLevelStore } from '../lib/stores/levelStore';

interface AttendanceCalendarProps {
  compact?: boolean;
}

export default function AttendanceCalendar({ compact = false }: AttendanceCalendarProps) {
  const { loginDates, dailyBonus } = useLevelStore();

  // Generate calendar for current month
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Create array of login dates as strings for easy comparison
  const loginDatesStrings = loginDates.map(date => 
    new Date(date).toDateString()
  );

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(currentYear, currentMonth, day);
    const dateString = currentDate.toDateString();
    const isToday = dateString === today.toDateString();
    const hasAttended = loginDatesStrings.includes(dateString);
    const isFuture = currentDate > today;
    
    calendarDays.push({
      day,
      date: currentDate,
      dateString,
      isToday,
      hasAttended,
      isFuture
    });
  }

  // Calculate streaks and stats
  const currentStreak = dailyBonus.streakDays;
  const monthAttendance = calendarDays.filter(day => day && day.hasAttended).length;
  const attendanceRate = Math.round((monthAttendance / today.getDate()) * 100);

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  if (compact) {
    return (
      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Calendar size={20} className="text-green-600 mr-2" />
            <span className="font-semibold text-green-900">출석 현황</span>
          </div>
          <Badge className="bg-green-100 text-green-800">
            {currentStreak}일 연속
          </Badge>
        </div>
        
        <div className="flex justify-between text-sm">
          <div className="text-center">
            <div className="font-bold text-green-600">{monthAttendance}</div>
            <div className="text-xs text-green-700">이번 달</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-600">{attendanceRate}%</div>
            <div className="text-xs text-blue-700">출석률</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-purple-600">{currentStreak}</div>
            <div className="text-xs text-purple-700">연속 출석</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Calendar size={24} className="text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">출석 캘린더</h3>
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          {monthNames[currentMonth]} {currentYear}
        </Badge>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-xl font-bold text-green-600">{monthAttendance}</div>
          <div className="text-sm text-green-700">이번 달 출석</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-xl font-bold text-blue-600">{attendanceRate}%</div>
          <div className="text-sm text-blue-700">출석률</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-xl font-bold text-purple-600">{currentStreak}</div>
          <div className="text-sm text-purple-700">연속 출석</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="mb-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map(day => (
            <div
              key={day}
              className="text-center py-2 text-sm font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`
                aspect-square flex items-center justify-center text-sm rounded-lg relative
                ${!day ? '' : 
                  day.isToday ? 'bg-yellow-200 border-2 border-yellow-400 font-bold text-yellow-900' :
                  day.hasAttended ? 'bg-green-100 text-green-800 border border-green-300' :
                  day.isFuture ? 'bg-gray-50 text-gray-400' :
                  'bg-red-50 text-red-600 border border-red-200'
                }
              `}
            >
              {day && (
                <>
                  <span className={day.isToday ? 'font-bold' : ''}>{day.day}</span>
                  
                  {/* Attendance Status Icons */}
                  {day.hasAttended && !day.isToday && (
                    <div className="absolute top-0.5 right-0.5">
                      <Check size={10} className="text-green-600" />
                    </div>
                  )}
                  
                  {!day.hasAttended && !day.isFuture && !day.isToday && (
                    <div className="absolute top-0.5 right-0.5">
                      <X size={10} className="text-red-500" />
                    </div>
                  )}
                  
                  {day.isToday && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse">
                      <div className="absolute inset-0.5 bg-yellow-600 rounded-full"></div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
              <span className="text-gray-600">출석 완료</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-400 rounded mr-2"></div>
              <span className="text-gray-600">오늘</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded mr-2"></div>
              <span className="text-gray-600">미출석</span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Milestones */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <h4 className="text-sm font-semibold text-purple-900 mb-3">연속 출석 리워드</h4>
        <div className="space-y-2">
          <div className={`flex items-center justify-between p-2 rounded ${
            currentStreak >= 7 ? 'bg-green-100 border border-green-200' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center">
              <Star size={14} className={currentStreak >= 7 ? 'text-green-600' : 'text-gray-400'} />
              <span className={`ml-2 text-sm ${currentStreak >= 7 ? 'text-green-800' : 'text-gray-600'}`}>
                7일 연속 출석
              </span>
            </div>
            <div className={`text-sm font-semibold ${currentStreak >= 7 ? 'text-green-600' : 'text-gray-500'}`}>
              +100 XP
            </div>
          </div>
          <div className={`flex items-center justify-between p-2 rounded ${
            currentStreak >= 30 ? 'bg-blue-100 border border-blue-200' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center">
              <Zap size={14} className={currentStreak >= 30 ? 'text-blue-600' : 'text-gray-400'} />
              <span className={`ml-2 text-sm ${currentStreak >= 30 ? 'text-blue-800' : 'text-gray-600'}`}>
                30일 연속 출석
              </span>
            </div>
            <div className={`text-sm font-semibold ${currentStreak >= 30 ? 'text-blue-600' : 'text-gray-500'}`}>
              +500 XP
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}