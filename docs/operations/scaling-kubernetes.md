# Kubernetes Scaling Guide

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Author:** Augment Agent (Claude Sonnet 4)

---

## Overview

This guide provides instructions for deploying DeFiLlama on Kubernetes for advanced orchestration and scaling.

**Benefits:**
- Advanced orchestration
- Auto-scaling (HPA, VPA, Cluster Autoscaler)
- Self-healing
- Service mesh integration
- Multi-cloud support
- Rich ecosystem (Helm, Operators, etc.)

**Target Architecture:**
- 3+ control plane nodes
- 5+ worker nodes
- Persistent storage (PVC)
- Ingress controller (Nginx/Traefik)
- Monitoring (Prometheus Operator)

---

## Prerequisites

- Kubernetes 1.28+ cluster
- kubectl configured
- Helm 3+ installed
- Persistent storage provider (NFS, Ceph, or cloud provider)
- Ingress controller installed

---

## Deployment

### 1. Create Namespace

```bash
kubectl create namespace defillama
kubectl config set-context --current --namespace=defillama
```

### 2. Create Secrets

```bash
# PostgreSQL password
kubectl create secret generic postgres-secret \
  --from-literal=password=your_postgres_password

# Redis password
kubectl create secret generic redis-secret \
  --from-literal=password=your_redis_password

# Application secrets
kubectl create secret generic app-secret \
  --from-literal=jwt-secret=your_jwt_secret \
  --from-literal=api-key=your_api_key
```

### 3. Deploy PostgreSQL

**postgres-statefulset.yaml:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  ports:
  - port: 5432
  clusterIP: None
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: defillama
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

### 4. Deploy Redis

**redis-deployment.yaml:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  ports:
  - port: 6379
  selector:
    app: redis
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

### 5. Deploy API

**api-deployment.yaml:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
  selector:
    app: api
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: ghcr.io/defillama/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: POSTGRES_HOST
          value: postgres
        - name: REDIS_HOST
          value: redis
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

### 6. Deploy Ingress

**ingress.yaml:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: defillama-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - defillama.com
    secretName: defillama-tls
  rules:
  - host: defillama.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 3000
```

### 7. Apply Manifests

```bash
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f api-deployment.yaml
kubectl apply -f ingress.yaml

# Verify deployment
kubectl get all
kubectl get ingress
```

---

## Auto-scaling

### Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```bash
kubectl apply -f api-hpa.yaml
kubectl get hpa
```

### Vertical Pod Autoscaler (VPA)

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Auto"
```

---

## Monitoring

### Prometheus Operator

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80
```

### Service Monitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-monitor
spec:
  selector:
    matchLabels:
      app: api
  endpoints:
  - port: metrics
    interval: 30s
```

---

## Troubleshooting

```bash
# Check pod status
kubectl get pods
kubectl describe pod <POD-NAME>
kubectl logs <POD-NAME>

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Debug pod
kubectl exec -it <POD-NAME> -- /bin/sh

# Check resources
kubectl top nodes
kubectl top pods
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-14  
**Next Review:** 2025-11-14

