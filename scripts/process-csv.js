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

// 중복 제거 처리
const originalCount = allData.length;
console.log(`📊 중복 제거 전: ${originalCount}개 행`);

if (originalCount > 0) {
  // 중복 제거 기준 컬럼들
  const deduplicationColumns = [
    '가격차이_만원','네이버_단지명','네이버_시도','네이버_시군구','네이버_읍면동',
    '네이버_공급면적','네이버_매매가','네이버_층정보','네이버_확인일자',
    'KB_하위평균','KB_일반평균','네이버_단지코드'
  ];
  
  // 중복 제거 함수
  function removeDuplicates(data, columns) {
    const seen = new Set();
    const uniqueData = [];
    
    data.forEach(row => {
      // 중복 제거 기준 컬럼들의 값을 조합하여 키 생성
      const key = columns.map(col => {
        const value = row[col];
        // null, undefined, 빈 문자열을 모두 동일하게 처리
        return value === null || value === undefined || value === '' ? 'NULL' : String(value);
      }).join('|');
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueData.push(row);
      }
    });
    
    return uniqueData;
  }
  
  // 중복 제거 실행
  allData = removeDuplicates(allData, deduplicationColumns);
  const duplicateCount = originalCount - allData.length;
  
  console.log(`🔄 중복 제거 완료: ${duplicateCount}개 중복 제거`);
  console.log(`📊 중복 제거 후: ${allData.length}개 행`);
}

// 통계 계산
const totalCount = allData.length;

const uniqueLocations = new Set(allData.map(row => 
  row['네이버_시도'] && row['네이버_시군구'] ? 
  `${row['네이버_시도']} ${row['네이버_시군구']}` : '알 수 없음'
)).size;

console.log(`📊 최종 통계: 총 ${totalCount}개 행, ${uniqueLocations}개 지역`);

// 데이터 테이블 HTML 생성
let dataTableHTML = '';
if (totalCount > 0) {  
  const selectedColumns = [
  '가격차이_만원','네이버_단지명','네이버_시도','네이버_시군구','네이버_읍면동','네이버_공급면적','네이버_매매가','네이버_층정보','네이버_확인일자','KB_하위평균','KB_일반평균','네이버_단지코드'
  ];
  
  const headers = selectedColumns.filter(col => allData[0].hasOwnProperty(col));
  
  // 가격차이_만원이 1000 이상인 데이터만 필터링하고 내림차순 정렬
  const filteredData = allData
    .filter(row => {
      const priceDiff = parseFloat(row['가격차이_만원']) || 0;
      return priceDiff >= 1000;
    })
    .sort((a, b) => {
      const priceA = parseFloat(a['가격차이_만원']) || 0;
      const priceB = parseFloat(b['가격차이_만원']) || 0;
      return priceB - priceA; // 내림차순 정렬
    });
  
  const displayData = filteredData.slice(0, 100);

  // 시도/시군구 옵션 생성
  const sidoOptions = [...new Set(filteredData.map(row => row['네이버_시도']).filter(Boolean))].sort();
  const sigunguOptions = [...new Set(filteredData.map(row => row['네이버_시군구']).filter(Boolean))].sort();
  
  
  dataTableHTML = `
    <div style="margin: 30px 0;">
      <h2 style="color: #764ba2; margin-bottom: 20px;">📊 부동산 매물 데이터</h2>
      
      <!-- 중복 제거 정보 -->
      <div style="background: #e8f5e8; padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #28a745;">
        <h3 style="color: #155724; margin-bottom: 10px; font-size: 16px;">🔄 중복 제거 결과</h3>
        <div style="color: #155724; font-weight: 600;">
          원본 데이터: ${originalCount.toLocaleString()}개 → 중복 제거 후: ${totalCount.toLocaleString()}개 
          <span style="color: #dc3545;">(${(originalCount - totalCount).toLocaleString()}개 중복 제거)</span>
        </div>
        <div style="color: #6c757d; font-size: 14px; margin-top: 5px;">
          중복 제거 기준: 가격차이, 단지명, 지역정보, 면적, 매매가, 층정보, 확인일자, KB평균가, 단지코드
        </div>
      </div>
      
      <!-- 필터 영역 -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #dee2e6;">
        <h3 style="color: #495057; margin-bottom: 15px; font-size: 16px;">🔍 지역 필터</h3>
        <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-weight: 600; color: #495057;">시도:</label>
            <select id="sidoFilter" onchange="filterData()" style="padding: 8px 12px; border: 1px solid #ced4da; border-radius: 5px; background: white; min-width: 120px;">
              <option value="">전체</option>
              ${sidoOptions.map(sido => `<option value="${sido}">${sido}</option>`).join('')}
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-weight: 600; color: #495057;">시군구:</label>
            <select id="sigunguFilter" onchange="filterData()" style="padding: 8px 12px; border: 1px solid #ced4da; border-radius: 5px; background: white; min-width: 120px;">
              <option value="">전체</option>
              ${sigunguOptions.map(sigungu => `<option value="${sigungu}">${sigungu}</option>`).join('')}
            </select>
          </div>
          <button onclick="resetFilters()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
            초기화
          </button>
          <div id="filterStatus" style="margin-left: 10px; color: #6c757d; font-weight: 600;"></div>
        </div>
      </div>
      
      <!-- 데이터 테이블 -->
      <div style="overflow-x: auto; max-height: 600px; border: 1px solid #ddd; border-radius: 10px; background: white;">
        <table id="dataTable" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; position: sticky; top: 0;">
            <tr>
              ${headers.map(header => 
                `<th style="border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: 600; white-space: nowrap;">${header}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody id="dataBody">
            ${displayData.map((row, index) => `
              <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};" 
                  data-sido="${row['네이버_시도'] || ''}" 
                  data-sigungu="${row['네이버_시군구'] || ''}">
                ${headers.map(header => {
                  let value = row[header] || '';
                  
                  // 네이버 단지명에 링크 추가 (단지코드가 있는 경우에만)
                  if (header === '네이버_단지명' && value) {
                    const complexCode = row['네이버_단지코드'];
                    // 단지코드가 있고 유효한 경우에만 링크 추가
                    if (complexCode && complexCode !== '' && complexCode !== null && complexCode !== undefined) {
                      value = `<a href="https://new.land.naver.com/complexes/${complexCode}" 
                                 target="_blank" 
                                 style="color: #667eea; text-decoration: none; font-weight: 600; transition: color 0.2s ease;"
                                 onmouseover="this.style.color='#764ba2'; this.style.textDecoration='underline';"
                                 onmouseout="this.style.color='#667eea'; this.style.textDecoration='none';">
                                 ${value} 🔗
                               </a>`;
                    } else {
                      // 단지코드가 없는 경우 단순 텍스트로 표시하고 시각적으로 구분
                      value = `<span style="color: #6c757d; font-weight: 600;">${value}</span> 
                               <span style="color: #dc3545; font-size: 10px; background: #f8d7da; padding: 2px 4px; border-radius: 3px;">링크없음</span>`;
                    }
                  }
                  // 단지코드 표시 (디버깅용)
                  else if (header === '네이버_단지코드') {
                    if (value && value !== '' && value !== null && value !== undefined) {
                      value = `<span style="color: #28a745; font-size: 11px; font-weight: 600;">${value}</span>`;
                    } else {
                      value = `<span style="color: #dc3545; font-size: 11px; font-weight: 600;">없음</span>`;
                    }
                  }
                  // 가격차이 하이라이트
                  else if (header.includes('가격차이') && typeof value === 'number') {
                    value = `<span style="color: #f39c12; font-weight: bold;">+${value.toLocaleString()}만원</span>`;
                  }
                  // 가격 하이라이트
                  else if (header.includes('매매가') && typeof value === 'number') {
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
          </tbody>
        </table>
      </div>
      
      <div id="tableStatus" style="text-align: center; margin-top: 15px; color: #6c757d; font-weight: 600;">
        총 ${filteredData.length}개 매물 중 ${Math.min(100, filteredData.length)}개 표시
      </div>
    </div>
  `;
}

// 데이터 품질 통계 계산
let qualityStats = {
  totalItems: totalCount,
  withComplexCode: 0,
  withoutComplexCode: 0,
  withComplexName: 0,
  withoutComplexName: 0
};

if (totalCount > 0) {
  allData.forEach(row => {
    const complexCode = row['네이버_단지코드'];
    const complexName = row['네이버_단지명'];
    
    // 단지코드 통계
    if (complexCode && complexCode !== '' && complexCode !== null && complexCode !== undefined) {
      qualityStats.withComplexCode++;
    } else {
      qualityStats.withoutComplexCode++;
    }
    
    // 단지명 통계
    if (complexName && complexName !== '' && complexName !== null && complexName !== undefined) {
      qualityStats.withComplexName++;
    } else {
      qualityStats.withoutComplexName++;
    }
  });
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
            padding: 20px;
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
        .quality-stats {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
        }
        .quality-stats h3 {
            color: #495057;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        .quality-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .quality-item:last-child {
            border-bottom: none;
        }
        .quality-good {
            color: #28a745;
            font-weight: 600;
        }
        .quality-warning {
            color: #ffc107;
            font-weight: 600;
        }
        .quality-bad {
            color: #dc3545;
            font-weight: 600;
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
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            transition: color 0.3s ease;
        }
        .file-info h3:hover {
            color: #667eea;
        }
        .file-info h3::before {
            content: '▼';
            margin-right: 10px;
            transition: transform 0.3s ease;
        }
        .file-info h3.collapsed::before {
            transform: rotate(-90deg);
        }
        .file-list {
            max-height: 1000px;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        .file-list.collapsed {
            max-height: 0;
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
        
        /* 링크 스타일 추가 */
        a {
            transition: all 0.2s ease;
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
            <br>
            <span style="font-size: 0.9em; opacity: 0.9;">
                원본 ${originalCount.toLocaleString()}개 → 중복 제거 후 ${totalCount.toLocaleString()}개 
                (${(originalCount - totalCount).toLocaleString()}개 중복 제거)
            </span>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>${totalCount.toLocaleString()}</h3>
                <p>총 매물 수 (중복 제거 후)</p>
            </div>
            <div class="stat-card">
                <h3>${fileStats.length}</h3>
                <p>처리된 파일 수</p>
            </div>
            <div class="stat-card">
                <h3>${uniqueLocations}</h3>
                <p>고유 지역 수</p>
            </div>
            <div class="stat-card">
                <h3>${(originalCount - totalCount).toLocaleString()}</h3>
                <p>제거된 중복 수</p>
            </div>
        </div>
        
        ${totalCount > 0 ? `
        <div class="quality-stats">
            <h3>📊 데이터 품질 현황</h3>
            <div class="quality-item">
                <span>단지코드 보유 매물</span>
                <span class="${qualityStats.withComplexCode > 0 ? 'quality-good' : 'quality-bad'}">
                    ${qualityStats.withComplexCode.toLocaleString()}개 
                    (${((qualityStats.withComplexCode / qualityStats.totalItems) * 100).toFixed(1)}%)
                </span>
            </div>
            <div class="quality-item">
                <span>단지코드 없는 매물</span>
                <span class="${qualityStats.withoutComplexCode > 0 ? 'quality-warning' : 'quality-good'}">
                    ${qualityStats.withoutComplexCode.toLocaleString()}개 
                    (${((qualityStats.withoutComplexCode / qualityStats.totalItems) * 100).toFixed(1)}%)
                </span>
            </div>
            <div class="quality-item">
                <span>단지명 보유 매물</span>
                <span class="${qualityStats.withComplexName > 0 ? 'quality-good' : 'quality-bad'}">
                    ${qualityStats.withComplexName.toLocaleString()}개 
                    (${((qualityStats.withComplexName / qualityStats.totalItems) * 100).toFixed(1)}%)
                </span>
            </div>
            <div class="quality-item">
                <span>링크 연결 가능 매물</span>
                <span class="${qualityStats.withComplexCode > 0 ? 'quality-good' : 'quality-bad'}">
                    ${qualityStats.withComplexCode.toLocaleString()}개 
                    (단지코드 + 단지명 모두 있는 경우)
                </span>
            </div>
        </div>
        ` : ''}
        
        ${dataTableHTML}
        
        ${fileStats.length > 0 ? `
        <div class="file-info">
            <h3 onclick="toggleFileList()" id="fileToggle" class="collapsed">📁 파일 처리 현황</h3>
           <div class="file-list collapsed" id="fileList">
                ${fileStats.map(stat => 
                `<div class="file-item">
                    <strong>📄 ${stat.파일명}</strong><br>
                    ${stat.행수.toLocaleString()}개 행 처리 (${stat.처리시간})
                </div>`
                ).join('')}
            </div>
        </div>
        ` : `
        <div class="file-info">
            <h3>📁 CSV 파일 대기 중</h3>
            <p style="text-align: center; color: #6c757d; padding: 20px;">
                data/ 폴더에 CSV 파일을 업로드하면 자동으로 처리됩니다.
            </p>
        </div>
        `}

        <div class="footer">
            <h4>🚀 완전 자동화 시스템 (중복 제거 기능 포함)</h4>
            <p>GitHub Actions + Netlify 자동 배포</p>
            <p>파일 업로드 → 자동 처리 → 중복 제거 → 실시간 웹 업데이트</p>
            <p style="margin-top: 10px; font-size: 0.9em; color: #999;">
                💡 단지코드가 있는 단지명을 클릭하면 네이버 부동산 상세 페이지로 이동합니다
            </p>
            <p style="margin-top: 5px; font-size: 0.9em; color: #dc3545;">
                ⚠️ "링크없음" 표시는 해당 매물의 네이버 단지코드가 없어 직접 링크 연결이 불가능한 경우입니다
            </p>
            <p style="margin-top: 5px; font-size: 0.9em; color: #28a745;">
                🔄 중복 제거 기준: 모든 주요 컬럼(가격차이, 단지명, 지역, 면적, 가격, 층, 날짜, KB평균가, 단지코드)
            </p>
        </div>
    </div>
    <script>
        function toggleFileList() {
            const fileList = document.getElementById('fileList');
            const fileToggle = document.getElementById('fileToggle');
            
            fileList.classList.toggle('collapsed');
            fileToggle.classList.toggle('collapsed');
        }

        // 필터링 함수
        function filterData() {
            const sidoFilter = document.getElementById('sidoFilter').value;
            const sigunguFilter = document.getElementById('sigunguFilter').value;
            const rows = document.querySelectorAll('#dataBody tr');
            
            let visibleCount = 0;
            
            rows.forEach(row => {
                const sido = row.getAttribute('data-sido');
                const sigungu = row.getAttribute('data-sigungu');
                
                const sidoMatch = !sidoFilter || sido === sidoFilter;
                const sigunguMatch = !sigunguFilter || sigungu === sigunguFilter;
                
                if (sidoMatch && sigunguMatch) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });
            
            // 상태 업데이트
            document.getElementById('filterStatus').textContent = 
                sidoFilter || sigunguFilter ? '필터 적용: ' + visibleCount + '개 매물' : '';
        }

        // 필터 초기화
        function resetFilters() {
            document.getElementById('sidoFilter').value = '';
            document.getElementById('sigunguFilter').value = '';
            filterData();
        }
    </script>    
</body>
</html>`;

fs.writeFileSync('./index.html', html, 'utf8');
console.log(`✅ HTML 파일 생성 완료 (${totalCount}개 행 처리)`);
console.log(`📊 데이터 품질: 단지코드 보유 ${qualityStats.withComplexCode}개 / 없음 ${qualityStats.withoutComplexCode}개`);
console.log(`🔄 중복 제거 결과: 원본 ${originalCount}개 → 최종 ${totalCount}개 (${originalCount - totalCount}개 중복 제거)`);

// 중복 제거된 데이터를 새로운 CSV로 저장 (옵션)
if (totalCount > 0) {
  const csvOutput = Papa.unparse(allData);
  fs.writeFileSync('./merged_deduplicated_data.csv', csvOutput, 'utf8');
  console.log(`💾 중복 제거된 통합 CSV 파일 생성: merged_deduplicated_data.csv`);
}
