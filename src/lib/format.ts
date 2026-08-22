/** 원화 정수 금액을 "12,345원" 형식으로 표기한다. */
export function formatKRW(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
