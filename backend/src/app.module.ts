import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { NeedsModule } from './modules/needs/needs.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      autoLoadEntities: true,
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      synchronize: false,
      logging: true,
    }),
    RolesModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    NeedsModule,
    ResourcesModule,
    OrganizationsModule,
    // MatchesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
