// ============================
// 캔들 차트 컴포넌트
// - lightweight-charts v5 사용
// - 한국식 캔들 색상 (양봉 빨강, 음봉 파랑)
// - RN 라인 오버레이 (상단=금색, 하단=시안)
// ============================

import { useEffect, useRef } from 'react';
import {
    createChart,
    CandlestickSeries,
    type IChartApi,
    type ISeriesApi,
    type CandlestickData,
    type Time,
} from 'lightweight-charts';
import type { CandleData, RNLine } from '../types';

interface Props {
    candles: CandleData[];
    upperRN: RNLine | null;
    lowerRN: RNLine | null;
    allRNLines: RNLine[];
}

export default function TradingChart({ candles, upperRN, lowerRN }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

    // ── 차트 초기화 (마운트 시 1회) ──
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            layout: {
                background: { color: 'transparent' },
                textColor: 'rgba(232, 234, 240, 0.6)',
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            crosshair: {
                vertLine: { color: 'rgba(0, 229, 255, 0.3)', width: 1, style: 2 },
                horzLine: { color: 'rgba(0, 229, 255, 0.3)', width: 1, style: 2 },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.06)',
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.06)',
                timeVisible: false,
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#ff1744',
            downColor: '#2979ff',
            borderUpColor: '#ff1744',
            borderDownColor: '#2979ff',
            wickUpColor: '#ff1744',
            wickDownColor: '#2979ff',
        });

        chartRef.current = chart;
        seriesRef.current = series;

        // 반응형 리사이즈
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    chart.applyOptions({ width, height });
                }
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    // ── 데이터 업데이트 (종목 변경시 차트 갱신) ──
    useEffect(() => {
        const series = seriesRef.current;
        const chart = chartRef.current;
        if (!series || !chart || candles.length === 0) return;

        // 캔들 데이터 세팅
        const chartData: CandlestickData<Time>[] = candles.map((c) => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));
        series.setData(chartData);

        // ★ 기존 PriceLine 모두 제거 후 새로 생성 (누적 방지)
        // lightweight-charts v5에서는 series에 직접 removePriceLine 사용
        // 대신 시리즈를 교체하는 방식 대신, 차트 전체를 다시 세팅
        // v5의 createPriceLine은 IPriceLine 객체를 반환하므로 이를 추적
        const priceLines: ReturnType<typeof series.createPriceLine>[] = [];

        // 상단 RN 라인 (금색)
        if (upperRN) {
            const pl = series.createPriceLine({
                price: upperRN.price,
                color: '#ffd54f',
                lineWidth: 2,
                lineStyle: 0,
                axisLabelVisible: true,
                title: `▲ ${upperRN.label}`,
            });
            priceLines.push(pl);
        }

        // 하단 RN 라인 (시안)
        if (lowerRN) {
            const pl = series.createPriceLine({
                price: lowerRN.price,
                color: '#00e5ff',
                lineWidth: 2,
                lineStyle: 0,
                axisLabelVisible: true,
                title: `▼ ${lowerRN.label}`,
            });
            priceLines.push(pl);
        }

        chart.timeScale().fitContent();

        // 클린업: 다음 렌더링 전에 PriceLine 제거
        return () => {
            if (seriesRef.current) {
                for (const pl of priceLines) {
                    try {
                        seriesRef.current.removePriceLine(pl);
                    } catch {
                        // 차트가 이미 제거된 경우 무시
                    }
                }
            }
        };
    }, [candles, upperRN, lowerRN]);

    return (
        <div className="glass-card">
            <div className="card-title">📈 캔들 차트 · RN 라인 오버레이</div>
            <div className="chart-container" ref={containerRef} />
        </div>
    );
}
