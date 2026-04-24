# Stage 1: Build the JAR with Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and download dependencies first (layer caching)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Generate application.properties from build args / env
ARG SPRING_DATASOURCE_URL
ARG SPRING_DATASOURCE_USERNAME
ARG SPRING_DATASOURCE_PASSWORD
ARG RAZORPAY_KEY
ARG RAZORPAY_SECRET
ARG CORS_ALLOWED_ORIGINS

RUN mkdir -p src/main/resources && cat > src/main/resources/application.properties << 'EOF'
spring.application.name=ehr-backend
server.port=${PORT:8080}
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}
spring.datasource.hikari.maximum-pool-size=5
spring.datasource.hikari.connection-timeout=20000
spring.jpa.hibernate.ddl-auto=none
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
cors.allowed.origins=${CORS_ALLOWED_ORIGINS:http://localhost:5173}
razorpay.api.key=${RAZORPAY_KEY}
razorpay.api.secret=${RAZORPAY_SECRET}
EOF

# Build the JAR
RUN mvn clean package -DskipTests

# Stage 2: Lightweight runtime image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
