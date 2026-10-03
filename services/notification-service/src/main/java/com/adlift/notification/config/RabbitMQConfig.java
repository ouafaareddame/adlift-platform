package com.adlift.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "adlift.exchange";
    public static final String QUEUE = "adlift.notifications.queue";
    public static final String ROUTING_KEY = "campaign.status.changed";
    public static final String ACTIVITY_QUEUE = "adlift.activity.queue";
    public static final String ACTIVITY_ROUTING_KEY = "activity.#";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue(QUEUE, true); // true = durable, survit à un redémarrage RabbitMQ
    }

    @Bean
    public Binding binding() {
        return BindingBuilder
                .bind(notificationQueue())
                .to(exchange())
                .with(ROUTING_KEY);
    }

    @Bean
    public Queue activityQueue() {
        return new Queue(ACTIVITY_QUEUE, true);
    }

    @Bean
    public Binding activityBinding() {
        return BindingBuilder
                .bind(activityQueue())
                .to(exchange())
                .with(ACTIVITY_ROUTING_KEY);
    }

    // Convertit automatiquement les messages Java <-> JSON
    @Bean
    public org.springframework.amqp.support.converter.MessageConverter jsonMessageConverter() {
        return new org.springframework.amqp.support.converter.JacksonJsonMessageConverter();
    }
}