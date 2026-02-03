import axios from "axios";
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { getCache } from "@/plugins/cache";

// 如有全局 TOKEN key，可在此统一维护，避免硬编码分散
export const TOKEN_KEY = "TOKEN";

/**
 * @description 基础配置
 */
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_GLOBAL_API_URL as string,
  timeout: 60 * 1000,
  headers: { "Content-Type": "application/json;charset=UTF-8;" },
});

/**
 * @description 请求拦截器
 */
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // const token = getCache(TOKEN_KEY)
    // if (token) {
    //   if (config.headers && typeof (config.headers as any).set === 'function') {
    //     ;(config.headers as any).set(TOKEN_KEY, token)
    //   } else {
    //     ;(config.headers as any) = { ...(config.headers as any), [TOKEN_KEY]: token }
    //   }
    // }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

/**
 * @description 响应拦截器
 */
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data, config, status } = response;
    // 对下载进度的特殊处理
    if ((config as AxiosRequestConfig).onDownloadProgress && status === 200) {
      return data;
    }
    return data;
  },
  (error: unknown) => Promise.reject(error),
);

/**
 * @description GET
 */
export const GET = async <T = any>(
  url: string,
  params?: Record<string, any> & {
    onDownloadProgress?: AxiosRequestConfig["onDownloadProgress"];
  },
): Promise<T> => {
  const { onDownloadProgress, ...rest } = params || {};
  const res: AxiosResponse<T> = await service.get<T>(url, {
    params: rest,
    onDownloadProgress,
  });
  return res.data;
};

/**
 * @description POST
 */
export const POST = async <T = any>(
  url: string,
  body?: any & {
    onDownloadProgress?: AxiosRequestConfig["onDownloadProgress"];
  },
): Promise<T> => {
  const { onDownloadProgress, ...rest } = (body || {}) as Record<string, any>;
  const res: AxiosResponse<T> = await service.post<T>(url, rest, {
    onDownloadProgress,
  });
  return res.data;
};

export default service;
