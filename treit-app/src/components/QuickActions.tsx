import React, { memo } from 'react';
import { FileText, Target } from 'lucide-react';
import { Card } from './ui/card';

const QuickActions = memo(() => {
  return (
    <div className="px-4 mb-20">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6 text-center bg-gradient-to-br from-white to-slate-50 shadow-lg border border-yellow-200 hover:shadow-xl hover:border-yellow-300 transition-all duration-300 cursor-pointer">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-yellow-300">
            <FileText size={32} className="text-gray-900" />
          </div>
          <h4 className="font-semibold text-slate-800">프로젝트</h4>
        </Card>
        <Card className="p-6 text-center bg-gradient-to-br from-white to-slate-50 shadow-lg border border-gray-200 hover:shadow-xl hover:border-yellow-300 transition-all duration-300 cursor-pointer">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-gray-600">
            <Target size={32} className="text-white" />
          </div>
          <h4 className="font-semibold text-slate-800">레벨링 스퀘어</h4>
        </Card>
      </div>
    </div>
  );
});

QuickActions.displayName = 'QuickActions';

export default QuickActions;