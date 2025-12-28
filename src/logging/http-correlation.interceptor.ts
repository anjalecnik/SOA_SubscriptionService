import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { getCorrelationId } from './correlation-id.storage';

@Injectable()
export class HttpCorrelationInterceptor implements OnModuleInit {
  constructor(private readonly http: HttpService) {}

  onModuleInit() {
    this.http.axiosRef.interceptors.request.use((config) => {
      const cid = getCorrelationId();
      if (cid) {
        config.headers = config.headers ?? {};
        (config.headers as any)['X-Correlation-Id'] = cid;
      }
      return config;
    });
  }
}
