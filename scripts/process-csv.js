const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

console.log('🚀 CSV 파일 처리 시작...');

// CSV 파일들 찾기
const dataDir = './data';
let allData = [];
let fileStats = [];

if (fs.existsSync(dataDir)) {
  const csvFiles = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.csv'))
    .sort();
  
  console.log(`📁 발견된 CSV 파일: ${csvFiles.length}개`);
  
  csvFiles.forEach(file => {
    console.log(`📄 처리 중: ${file}`);
    try {
      const filePath = path.join(dataDir, file);
      const csvContent = fs.readFileSync(filePath, 'utf8');
      
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });
      
      console.log(`   ✅ ${file}: ${parsed.data.length}개 행 처리`);
      
      const dataWithSource = parsed.data.map(row => ({
        ...row,
        소스파일: file,
        처리일시: new Date().toLocaleString('ko-KR')
      }));
      
      allData = allData.concat(dataWithSource);
      fileStats.push({
        파일명: file,
        행수: parsed.data.length,
        처리시간: new Date().toLocaleString('ko-KR')
      });
    } catch (error) {
      console.error(`❌ ${file} 처리 오류:`, error.message);
    }
  });
} else {
  console.log('📂 data 폴더가 없습니다.');
}

// 통계 계산
const totalCount = allData.length;
const avgPrice = totalCount > 0 ? 
  allData.reduce((sum, row) => {
    const price = parseFloat(row['네이버_매매가_숫자']) || 0;
    return sum + price;
  }, 0) / totalCount : 0;

const uniqueLocations = new Set(allData.map(row => 
  row['네이버_시도'] && row['네이버_시군구'] ? 
  `${row['네이버_시도']} ${row['네이버_시군구']}` : '알 수 없음'
)).size;

console.log(`📊 통계: 총 ${totalCount}개 행, 평균 가격 ${Math.round(avgPrice)}만원, ${uniqueLocations}개 지역`);

// 데이터 테이블 HTML 생성
let dataTableHTML = '';
if (totalCount > 0) {
  const headers = Object.keys(allData[0]);
  const displayData = allData.slice(0, 100); // 최대 100개 행만 표시
  
  dataTableHTML = `
    <div style="margin: 30px 0;">
      <h2 style="color: #764ba2; margin-bottom: 15px;">📊 부동산 매물 데이터</h2>
      <div style="overflow-x: auto; max-height: 600px; border: 1px solid #ddd; border-radius: 10px; background: white;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; position: sticky; top: 0;">
            <tr>
              ${headers.map(header => 
                `<th style="border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: 600; white-space: nowrap;">${header}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>
            ${displayData.map((row, index) => `
              <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                ${headers.map(header => {
                  let value = row[header] || '';
                  
                  // 가격 하이라이트
                  if (header.includes('매매가') && typeof value === 'number') {
                    value = `<span style="color: #e74c3c; font-weight: bold;">${value.toLocaleString()}만원</span>`;
                  }
                  // 면적 하이라이트  
                  else if (header.includes('면적')) {
                    value = `<span style="color: #3498db; font-weight: 600;">${value}</span>`;
                  }
                  // 지역 하이라이트
                  else if (header.includes('시도') || header.includes('시군구') || header.includes('읍면동')) {
                    value = `<span style="color: #27ae60; font-weight: 600;">${value}</span>`;
                  }
                  
                  return `<td style="border: 1px solid #eee; padding: 8px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${value}</td>`;
                }).join('')}
              </tr>
            `).join('')}
            ${allData.length > 100 ? 
              `<tr style="background: #fff3cd;">
                <td colspan="${headers.length}" style="text-align: center; padding: 15px; font-weight: bold; color: #856404;">
                  ⚠️ 처음 100개 행만 표시됩니다. 총 ${allData.length}개 행이 처리되었습니다.
                </td>
              </tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 완전한 HTML 생성
const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>부동산 데이터 대시보드 - ${new Date().toLocaleDateString('ko-KR')}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', 'Apple SD Gothic Neo', sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            max-width: 1400px;
            margin: 0 auto;
            box-shadow: 0 25px 50px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
        }
        h1 { 
            color: #667eea; 
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.8em;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .update-banner {
            background: linear-gradient(45deg, #28a745, #20c997);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            margin: 20px 0;
            font-size: 1.1em;
            box-shadow: 0 10px 20px rgba(40, 167, 69, 0.3);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            margin: 40px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 15px 30px rgba(102, 126, 234, 0.3);
            transition: transform 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-5px);
        }
        .stat-card h3 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .stat-card p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .file-info {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
        }
        .file-info h3 {
            color: #495057;
            margin-bottom: 15px;
        }
        .file-item {
            padding: 10px;
            margin: 5px 0;
            background: white;
            border-radius: 5px;
            border-left: 4px solid #667eea;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            padding: 30px;
            border-top: 2px solid #eee;
            color: #6c757d;
        }
        .footer h4 {
            color: #495057;
            margin-bottom: 10px;
        }
        @media (max-width: 768px) {
            .container { padding: 20px; margin: 10px; }
            h1 { font-size: 2.2em; }
            .stats-grid { grid-template-columns: 1fr; gap: 15px; }
            table { font-size: 11px; }
            th, td { padding: 6px !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏠 부동산 데이터 대시보드</h1>
        
        <div class="update-banner">
            🎉 <strong>자동 업데이트 완료!</strong> 
            최종 업데이트: ${new Date().toLocaleString('ko-KR')}
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>${totalCount.toLocaleString()}</h3>
                <p>총 매물 수</p>
            </div>
            <div class="stat-card">
                <h3>${Math.round(avgPrice).toLocaleString()}</h3>
                <p>평균 매매가 (만원)</p>
            </div>
            <div class="stat-card">
                <h3>${fileStats.length}</h3>
                <p>처리된 파일 수</p>
            </div>
            <div class="stat-card">
                <h3>${uniqueLocations}</h3>
                <p>고유 지역 수</p>
            </div>
        </div>
        
        ${fileStats.length > 0 ? `
        <div class="file-info">
            <h3>📁 파일 처리 현황</h3>
            ${fileStats.map(stat => 
              `<div class="file-item">
                <strong>📄 ${stat.파일명}</strong><br>
                ${stat.행수.toLocaleString()}개 행 처리 (${stat.처리시간})
              </div>`
            ).join('')}
        </div>
        ` : `
        <div class="file-info">
            <h3>📁 CSV 파일 대기 중</h3>
            <p style="text-align: center; color: #6c757d; padding: 20px;">
                data/ 폴더에 CSV 파일을 업로드하면 자동으로 처리됩니다.
            </p>
        </div>
        `}
        
        ${dataTableHTML}
        
        <div class="footer">
            <h4>🚀 완전 자동화 시스템</h4>
            <p>GitHub Actions + Netlify 자동 배포</p>
            <p>CSV 파일 업로드 → 자동 처리 → 실시간 웹 업데이트</p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync('./index.html', html, 'utf8');
console.log(`✅ HTML 파일 생성 완료 (${totalCount}개 행 처리)`);
