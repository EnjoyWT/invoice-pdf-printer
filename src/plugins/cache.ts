/**
 * @description 设置
 */
export const setCache = (key: string, value: string, _domain?: string): void => {
  localStorage.setItem(key, value)
}

/**
 * @description 设置长缓存（目前与 setCache 相同，实现预留）
 */
export const setLongCache = (key: string, value: string, _domain?: string): void => {
  localStorage.setItem(key, value)
}

/**
 * @description 获取
 */
export const getCache = (key: string): string | null => {
  return localStorage.getItem(key)
}

/**
 * @description 删除
 */
export const removeCache = (key: string): void => {
  localStorage.removeItem(key)
}

/**
 * @description 删除所有
 */
export const clearCache = (): void => {
  localStorage.clear()
}


