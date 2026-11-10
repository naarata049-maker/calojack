// 見本の食事カード（コンピュータの写真・山札が足りないときの補充に使う）
// カロリーは Figma 決定版の数字にそろえた
import ramen from '../assets/photos/ramen.jpg'
import donut from '../assets/photos/donut.jpg'
import teriyaki from '../assets/photos/teriyaki.jpg'
import toast from '../assets/photos/toast.jpg'
import type { Card } from './types'

export const SAMPLE_FOODS: Card[] = [
  { id: 's-ramen', kind: 'food', name: '醤油ラーメン', kcal: 700, photo: ramen },
  { id: 's-donut', kind: 'food', name: 'ドーナツ', kcal: 300, photo: donut },
  { id: 's-teriyaki', kind: 'food', name: '鶏の照り焼き', kcal: 650, photo: teriyaki },
  { id: 's-toast', kind: 'food', name: 'トースト', kcal: 400, photo: toast },
]
