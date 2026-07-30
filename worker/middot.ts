export const MIDDOT = [
  ["Ribbui", "포함·확장"],
  ["Miut", "제한·배제"],
  ["Ribbui אחר Ribbui", "연속 확장"],
  ["Miut אחר Miut", "연속 제한"],
  ["Qal va-homer meforash", "명시적 경중 논증"],
  ["Qal va-homer satum", "암시적 경중 논증"],
  ["Gezerah shavah", "동일 표현의 연계"],
  ["Binyan av", "기초 원리의 구축"],
  ["Derekh qetsarah", "생략된 말의 보충"],
  ["Davar she-hu shanui", "반복"],
  ["Siddur she-neḥlaq", "논리적 재배열"],
  ["Davar she-ba le-lammed ve-nimtza lamed", "설명하는 비유가 다시 설명됨"],
  ["Klal she-aḥarav ma'aseh", "일반 진술 뒤의 세부"],
  ["Gadol she-nitlah be-qatan", "큰 것이 작은 것으로 설명됨"],
  ["Shenei ketuvim makḥishim", "모순처럼 보이는 두 진술의 조화"],
  ["Davar meyuḥad bi-meqomo", "문맥 안에서 해석되는 특별 표현"],
  ["Davar she-eino mitparesh bimqomo", "다른 곳에서 밝혀지는 불명확한 표현"],
  ["Davar she-ne'emar be-miqtsat", "부분이 전체를 대표함"],
  ["Davar she-ne'emar ba-zeh ve-noheg ba-ḥavero", "하나에 관한 말이 관련 대상에도 적용됨"],
  ["Davar she-ne'emar ba-zeh ve-eino inyan lo", "하나에 관한 말이 실제로 다른 대상을 가리킴"],
  ["Davar she-huqash li-shenei devarim", "두 대상의 좋은 성격을 함께 취함"],
  ["Davar she-ḥavero mokhiaḥ alav", "나란한 본문이 이 본문을 설명함"],
  ["Davar she-hu mokhiaḥ al ḥavero", "이 본문이 나란한 본문을 설명함"],
  ["Davar she-hayah bi-khlal ve-yatsa", "전체에서 나온 하나가 자신을 가르침"],
  ["Davar she-hayah bi-khlal ve-yatsa le-lammed", "전체에서 나온 하나가 다른 것을 가르침"],
  ["Mashal", "비유·유비"],
  ["Remez / Mi-ma'al", "암시·앞 문맥"],
  ["Mi-neged", "대조"],
  ["Gematria", "게마트리아"],
  ["Notarikon", "노타리콘"],
  ["Muqdam u-me'uḥar ba-inyan", "문맥 안의 비순차"],
  ["Muqdam u-me'uḥar ba-parashiyyot", "단락·사건의 비연대기성"]
] as const;

export function formatMiddot(start: number, end: number): string {
  return MIDDOT.slice(start - 1, end)
    .map(([name, korean], index) => `${start + index}. ${name} — ${korean}`)
    .join("\n");
}
