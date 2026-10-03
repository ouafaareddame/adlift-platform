package com.adlift.notification.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Hibernate crée une contrainte CHECK figée sur les valeurs de NotificationType
 * et ddl-auto=update ne la met jamais à jour : sans ce retrait, tout nouveau type
 * serait rejeté par PostgreSQL sur une base existante. L'enum Java reste le garde-fou.
 */
@Component
@RequiredArgsConstructor
public class NotificationSchemaFix implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
    }
}
